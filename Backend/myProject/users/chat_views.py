from rest_framework import generics, permissions, status, serializers as drf_serializers
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth.models import User

from .models import Chat, Message, Property, LandlordUser
from .chat_serializers import ChatSerializer, ChatCreateSerializer, MessageSerializer, MessageCreateSerializer
from .permissions import CanChat


class UserChatListView(generics.ListAPIView):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def get_queryset(self):
        return Chat.objects.filter(user=self.request.user).order_by('-updated_at')


class LandlordChatListView(generics.ListAPIView):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def get_queryset(self):
        landlord_id = _get_landlord_id(self.request)
        if not landlord_id:
            return Chat.objects.none()
        return Chat.objects.filter(landlord_id=landlord_id).order_by('-updated_at')


class ChatDetailView(generics.RetrieveAPIView):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        landlord_id = _get_landlord_id(self.request)
        q = Q(user=user)
        if landlord_id:
            q = q | Q(landlord_id=landlord_id)
        return Chat.objects.filter(q).distinct()


class ChatCreateView(generics.CreateAPIView):
    serializer_class = ChatCreateSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def perform_create(self, serializer):
        user = self.request.user
        landlord_id = serializer.validated_data.get('landlord')
        property_id = serializer.validated_data.get('property')
        subject = serializer.validated_data.get('subject', '')

        landlord = get_object_or_404(LandlordUser, id=landlord_id)

        property_obj = None
        if property_id:
            property_obj = get_object_or_404(Property, id=property_id)

        chat, created = Chat.objects.get_or_create(
            user=user,
            landlord=landlord,
            property=property_obj,
            defaults={'subject': subject}
        )
        self.instance = chat

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ChatCreateSerializer
        return ChatSerializer


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageCreateSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def create(self, request, *args, **kwargs):
        chat_id = kwargs.get('chat_id')
        chat = get_object_or_404(Chat, id=chat_id)

        landlord_id = _get_landlord_id(request)

        is_participant = chat.user_id == request.user.id
        if landlord_id and chat.landlord_id == landlord_id:
            is_participant = True
        if not is_participant:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        if landlord_id and chat.landlord_id == landlord_id:
            sender_landlord = get_object_or_404(LandlordUser, id=landlord_id)
            message = Message.objects.create(
                chat=chat,
                sender_landlord=sender_landlord,
                content=request.data.get('content'),
                image_url=request.data.get('image_url'),
                caption=request.data.get('caption'),
            )
        else:
            message = Message.objects.create(
                chat=chat,
                sender_user=request.user,
                content=request.data.get('content'),
                image_url=request.data.get('image_url'),
                caption=request.data.get('caption'),
            )

        chat.save(update_fields=['updated_at'])
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class GetChatMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def get_queryset(self):
        chat_id = self.kwargs.get('chat_id')
        user = self.request.user
        landlord_id = _get_landlord_id(self.request)

        chat = get_object_or_404(Chat, id=chat_id)

        is_participant = chat.user_id == user.id
        if landlord_id and chat.landlord_id == landlord_id:
            is_participant = True
        if not is_participant:
            return Message.objects.none()

        if landlord_id:
            chat.messages.filter(sender_user__isnull=False, is_read=False).update(is_read=True)
        else:
            chat.messages.filter(sender_landlord__isnull=False, is_read=False).update(is_read=True)

        return chat.messages.all().order_by('created_at')


class StartChatFromPropertyView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def create(self, request, *args, **kwargs):
        user = request.user
        property_id = request.data.get('property_id')
        initial_message = request.data.get('message', '')

        property_obj = get_object_or_404(Property, id=property_id)

        landlord = _resolve_landlord(None, property_obj, property_obj.owner if hasattr(property_obj, 'owner') else user)

        chat, created = Chat.objects.get_or_create(
            user=user,
            landlord=landlord,
            property=property_obj,
            defaults={'subject': f'Inquiry about {property_obj.title}'}
        )

        if initial_message:
            Message.objects.create(
                chat=chat,
                sender_user=user,
                content=initial_message
            )
            chat.save(update_fields=['updated_at'])

        return Response(
            ChatSerializer(chat).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class ConversationListView(generics.ListAPIView):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def get_queryset(self):
        user = self.request.user
        landlord_id = _get_landlord_id(self.request)
        q = Q(user=user)
        if landlord_id:
            q = q | Q(landlord_id=landlord_id)
        return Chat.objects.filter(q).order_by('-updated_at').distinct()


class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def get_queryset(self):
        user = self.request.user
        landlord_id = _get_landlord_id(self.request)
        q = Q(user=user)
        if landlord_id:
            q = q | Q(landlord_id=landlord_id)
        return Chat.objects.filter(q).distinct()

    def patch(self, request, *args, **kwargs):
        chat = self.get_object()
        Message.objects.filter(chat=chat, is_read=False).update(is_read=True)
        return Response({'status': 'Conversation marked as read'}, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        chat = self.get_object()
        chat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationMessageView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs.get('id')
        user = self.request.user
        landlord_id = _get_landlord_id(self.request)

        chat = get_object_or_404(Chat, id=conversation_id)

        is_participant = chat.user_id == user.id
        if landlord_id and chat.landlord_id == landlord_id:
            is_participant = True
        if not is_participant:
            return Message.objects.none()

        return Message.objects.filter(chat_id=conversation_id).order_by('created_at')

    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('id')
        user = self.request.user

        chat = get_object_or_404(Chat, id=conversation_id)
        landlord_id = _get_landlord_id(self.request)

        is_participant = chat.user_id == user.id
        if landlord_id and chat.landlord_id == landlord_id:
            is_participant = True
        if not is_participant:
            raise drf_serializers.ValidationError("Access denied")

        if landlord_id and chat.landlord_id == landlord_id:
            serializer.save(chat=chat, sender_landlord_id=landlord_id)
        else:
            serializer.save(chat=chat, sender_user=user)

        chat.save(update_fields=['updated_at'])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        msg = Message.objects.get(id=serializer.instance.id)
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


def _get_landlord_id(request) -> int | None:
    """Get landlord_id from JWT payload or look it up from the user's email."""
    # 1. Try JWT payload (LandlordUser login)
    auth = getattr(request, 'auth', None)
    if auth:
        payload = getattr(auth, 'payload', {})
        if payload:
            lid = payload.get('landlord_id')
            if lid:
                return lid

    # 2. Look up LandlordUser by user's email (regular User login)
    user = getattr(request, 'user', None)
    if user and user.is_authenticated and user.email:
        try:
            return LandlordUser.objects.get(email__iexact=user.email).id
        except LandlordUser.DoesNotExist:
            pass

    return None


def _resolve_landlord(landlord_id: int | None, property_obj: Property | None, user: User) -> LandlordUser:
    """Resolve a LandlordUser from given landlord_id, property, or user fallback."""
    # 1. Try landlord_id directly
    if landlord_id:
        try:
            return LandlordUser.objects.get(id=landlord_id)
        except LandlordUser.DoesNotExist:
            pass

    # 2. Try property.landlord
    if property_obj and property_obj.landlord:
        return property_obj.landlord

    # 3. Try to find a LandlordUser with same email as the User
    if user.email:
        try:
            return LandlordUser.objects.get(email__iexact=user.email)
        except LandlordUser.DoesNotExist:
            pass

    # 4. Auto-create a LandlordUser for this User
    from django.contrib.auth.hashers import make_password
    import uuid
    landlord = LandlordUser.objects.create(
        email=user.email or f"user_{user.id}@stayeasy.local",
        password=make_password(str(uuid.uuid4())),
        name=user.first_name or user.username,
        business_name=f"{user.username}'s Properties",
    )
    # Link the created LandlordUser back to the property so future calls reuse it
    if property_obj and not property_obj.landlord_id:
        property_obj.landlord = landlord
        property_obj.save(update_fields=['landlord'])
    return landlord


class GetOrCreateConversationView(generics.GenericAPIView):
    serializer_class = drf_serializers.Serializer
    permission_classes = [permissions.IsAuthenticated, CanChat]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        landlord_id = request.data.get('landlord_id')
        property_id = request.data.get('property_id')

        user = request.user

        if user_id and user_id != user.id:
            return Response(
                {'error': 'Cannot create conversation for another user'},
                status=status.HTTP_403_FORBIDDEN
            )

        property_obj = None
        if property_id:
            property_obj = get_object_or_404(Property, id=property_id)

        subject_user = property_obj.owner if (property_obj and property_obj.owner_id) else user
        landlord = _resolve_landlord(landlord_id, property_obj, subject_user)

        chat, created = Chat.objects.get_or_create(
            user=user,
            landlord=landlord,
            property=property_obj,
            defaults={'subject': f"Chat with {landlord.name}"}
        )

        return Response(
            ChatSerializer(chat).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
