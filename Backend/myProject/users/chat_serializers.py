from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Chat, Message, Property, LandlordUser


class PropertyMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = [
            "id", "title", "description", "city", "address",
            "property_type", "price", "available", "status",
            "owner",
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_type = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "content", "image_url", "caption",
            "sender_user", "sender_landlord",
            "sender_name", "sender_type",
            "is_read", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_sender_name(self, obj):
        if obj.sender_user:
            return obj.sender_user.first_name or obj.sender_user.username
        if obj.sender_landlord:
            return obj.sender_landlord.name
        return "Unknown"

    def get_sender_type(self, obj):
        if obj.sender_user:
            return "user"
        if obj.sender_landlord:
            return "landlord"
        return "unknown"


class ChatSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    user_name = serializers.CharField(source="user.first_name", read_only=True)
    landlord_name = serializers.CharField(source="landlord.name", read_only=True)

    landlord_user_id = serializers.SerializerMethodField()

    property = PropertyMiniSerializer(read_only=True)

    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    room_id = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id",
            "user",
            "user_name",
            "landlord",
            "landlord_name",
            "landlord_user_id",
            "property",
            "subject",
            "is_active",
            "messages",
            "last_message",
            "unread_count",
            "room_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return 0

        user = request.user

        # Landlord detection: JWT payload
        auth = getattr(request, 'auth', None)
        payload = getattr(auth, 'payload', {}) if auth else {}
        landlord_id = payload.get('landlord_id')

        # Landlord detection: email match (same logic as _get_landlord_id)
        if not landlord_id and user.email:
            try:
                landlord = LandlordUser.objects.get(email__iexact=user.email)
                landlord_id = landlord.id
            except LandlordUser.DoesNotExist:
                pass

        if landlord_id and obj.landlord_id == landlord_id:
            return obj.messages.filter(sender_user__isnull=False, is_read=False).count()

        return obj.messages.filter(sender_landlord__isnull=False, is_read=False).count()

    def get_room_id(self, obj):
        a = obj.user_id
        b = obj.landlord_id
        if a and b:
            return f"conv_{min(a,b)}_{max(a,b)}"
        return None

    def get_landlord_user_id(self, obj):
        if not obj.landlord_id:
            return None
        # 1. Try email match between LandlordUser and User
        landlord = obj.landlord
        if landlord and landlord.email:
            try:
                return User.objects.get(email__iexact=landlord.email).id
            except User.DoesNotExist:
                pass
        # 2. Fallback: the Chat's property owner is the landlord's regular User
        try:
            prop = obj.property
            if prop and prop.owner_id:
                return prop.owner_id
        except Exception:
            pass
        return None


class ChatCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ["landlord", "property", "subject"]


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["content", "image_url", "caption"]
