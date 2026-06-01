from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
import json
from .models import (
    Profile, KYC, Property, PropertyImage, Booking, Favorite, ViewedProperty, 
    LandlordUser, Chat, Message, CancellationPolicy, Payment, Refund, Cancellation, Notification,
    Warning, Suspension, ModerationAction, RentalAgreement, PaymentFailureInquiry,
)


# =====================================================
# LANDLORD USER SERIALIZERS
# =====================================================
class LandlordRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = LandlordUser
        fields = [
            "email",
            "name",
            "business_name",
            "phone",
            "password",
            "password2",
        ]

    def validate(self, attrs):
        # Check for duplicate email
        if LandlordUser.objects.filter(email__iexact=attrs.get("email")).exists():
            raise serializers.ValidationError({
                "email": "An account with this email already exists."
            })

        # Check password match
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({
                "password": "Passwords do not match"
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")

        landlord = LandlordUser.objects.create(**validated_data)
        
        # Use Django's password hashing
        from django.contrib.auth.hashers import make_password
        landlord.password = make_password(password)
        landlord.save()

        return landlord


class LandlordLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LandlordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandlordUser
        fields = [
            "id",
            "email",
            "name",
            "business_name",
            "phone",
            "is_active",
            "email_verified",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# =====================================================
# REGISTER SERIALIZER
# =====================================================
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True)

    # stored in Profile (not User)
    user_type = serializers.ChoiceField(
        choices=Profile.USER_TYPES,
        write_only=True
    )

    # returned from Profile
    user_type_display = serializers.CharField(
        source="profile.user_type",
        read_only=True
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "password2",
            "user_type",
            "user_type_display",
        ]

    # ---------------- VALIDATION ----------------
    def validate(self, attrs):
        email = attrs.get("email")

        # ⭐ FIX 1 — prevent duplicate email (case insensitive)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({
                "email": "An account with this email already exists."
            })

        # ⭐ FIX 2 — password match check
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({
                "password": "Passwords do not match"
            })

        return attrs

    # ---------------- CREATE USER ----------------
    def create(self, validated_data):
        validated_data.pop("password2")

        user_type = validated_data.pop("user_type")
        password = validated_data.pop("password")

        # ⭐ extra safety check (prevents race condition)
        email = validated_data["email"]
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({
                "email": "Email already registered."
            })

        user = User.objects.create(
            username=validated_data["username"],
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        user.set_password(password)
        user.save()

        # create profile
        Profile.objects.create(
            user=user,
            user_type=user_type
        )

        return user


# =====================================================
# VERIFY EMAIL SERIALIZER
# =====================================================
class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)


# =====================================================
# KYC SERIALIZERS
# =====================================================
class KYCSerializer(serializers.ModelSerializer):

    class Meta:
        model = KYC
        fields = [
            "full_name",
            "phone_number",
            "citizenship_number",
            "document_image",
            "document_back_image",
            "selfie_image",
            "status",
            "submitted_at",
        ]
        read_only_fields = ["status", "submitted_at"]


class KYCStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = KYC
        fields = ["status", "submitted_at"]


class KYCListSerializer(serializers.ModelSerializer):
    """Serializer for admin to view all KYC requests with user info"""
    user_info = serializers.SerializerMethodField()
    verified_by_info = serializers.SerializerMethodField()

    class Meta:
        model = KYC
        fields = [
            "id",
            "user_info",
            "full_name",
            "phone_number",
            "citizenship_number",
            "document_image",
            "document_back_image",
            "selfie_image",
            "status",
            "submitted_at",
            "verified_by_info",
            "verified_at",
        ]
        read_only_fields = ["submitted_at", "verified_at", "verified_by_info"]

    def get_user_info(self, obj):
        """Return user details"""
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
            "user_type": obj.user.profile.user_type,
        }

    def get_verified_by_info(self, obj):
        """Return admin who verified this KYC"""
        if obj.verified_by:
            return {
                "id": obj.verified_by.id,
                "username": obj.verified_by.username,
                "email": obj.verified_by.email,
            }
        return None


class KYCUpdateStatusSerializer(serializers.ModelSerializer):
    """Serializer for admin to update KYC status"""

    class Meta:
        model = KYC
        fields = ["status"]

    def validate_status(self, value):
        """Validate status is one of the allowed choices"""
        if value not in ['pending', 'approved', 'rejected']:
            raise serializers.ValidationError("Invalid status. Must be 'pending', 'approved', or 'rejected'")
        return value


# =====================================================
# PROPERTY IMAGE SERIALIZER
# =====================================================
class PropertyImageSerializer(serializers.ModelSerializer):
    # Return full image URL with /uploads/ prefix
    image = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ["id", "image"]

    def get_image(self, obj):
        """Return full image URL path"""
        if obj.image:
            # Return path with /uploads/ prefix for frontend to use
            return f"/uploads/{obj.image.name}"
        return None


# =====================================================
# PROPERTY CREATE SERIALIZER
# =====================================================
class PropertyCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Property
        exclude = ["owner", "created_at"]

    def to_internal_value(self, data):
        # Remove owner/landlord if sent by frontend
        data = data.copy()
        data.pop('owner', None)
        data.pop('landlord', None)
        return super().to_internal_value(data)

    def validate_images(self, images):
        """Validate that images meet minimum and maximum requirements"""
        MIN_IMAGES = 3
        MAX_IMAGES = 10
        
        if len(images) < MIN_IMAGES:
            raise serializers.ValidationError(
                f"Minimum {MIN_IMAGES} images required. Provided: {len(images)}"
            )
        
        if len(images) > MAX_IMAGES:
            raise serializers.ValidationError(
                f"Maximum {MAX_IMAGES} images allowed. Provided: {len(images)}"
            )
        
        return images

    def create(self, validated_data):
        images = validated_data.pop("images", [])
        
        # Ensure status defaults to 'published' if not provided
        if 'status' not in validated_data:
            validated_data['status'] = 'published'

        property_instance = Property.objects.create(
            **validated_data
        )

        for image in images:
            PropertyImage.objects.create(
                property=property_instance,
                image=image
            )

        return property_instance

# =====================================================
# PROPERTY UPDATE SERIALIZER
# Used for editing property (with image add/remove support)
# =====================================================


class PropertyUpdateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    existing_image_ids = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Property
        exclude = ["owner", "created_at"]

    def to_internal_value(self, data):
        data = data.copy()
        data.pop('owner', None)
        data.pop('landlord', None)
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        MIN_IMAGES = 3
        MAX_IMAGES = 10
        
        images = validated_data.pop("images", [])
        existing_image_ids = validated_data.pop("existing_image_ids", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Track existing images after deletion
        remaining_images = instance.images.count()

        if existing_image_ids is not None:
            try:
                existing_ids = json.loads(existing_image_ids)
            except:
                existing_ids = []
            for img in instance.images.all():
                if img.id not in existing_ids:
                    img.delete()
            remaining_images = len(existing_ids)

        # Add new images
        for image in images:
            PropertyImage.objects.create(
                property=instance,
                image=image
            )
        
        # Validate total images after update
        total_images = remaining_images + len(images)
        
        if total_images < MIN_IMAGES:
            raise serializers.ValidationError(
                f"Minimum {MIN_IMAGES} images required. You have {total_images} image(s)."
            )
        
        if total_images > MAX_IMAGES:
            raise serializers.ValidationError(
                f"Maximum {MAX_IMAGES} images allowed. You tried to add {total_images} image(s)."
            )

        return instance
# =====================================================
# PROPERTY SERIALIZER (READ)
# =====================================================
class PropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)
    main_image = serializers.SerializerMethodField()
    has_confirmed_booking = serializers.SerializerMethodField()
    booking_id = serializers.SerializerMethodField()
    booking_status = serializers.SerializerMethodField()
    booking_check_in = serializers.SerializerMethodField()
    booking_check_out = serializers.SerializerMethodField()
    booking_total_price = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    landlord_name = serializers.SerializerMethodField()
    landlord_id = serializers.IntegerField(source="landlord.id", read_only=True, allow_null=True)

    class Meta:
        model = Property
        fields = "__all__"
        read_only_fields = ["owner", "created_at"]

    def get_main_image(self, obj):
        """Return first image as main image for display"""
        first_image = obj.images.first()
        if first_image:
            return f"/uploads/{first_image.image.name}"
        return None

    def get_has_confirmed_booking(self, obj):
        """Check if property has a confirmed booking (payment fully verified)"""
        from .models import Booking
        return Booking.objects.filter(
            property=obj,
            status='confirmed'
        ).exists()

    def get_booking_id(self, obj):
        """Return the booking ID for the current authenticated user (if any)"""
        from .models import Booking
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = Booking.objects.filter(
                property=obj,
                user=request.user,
                status__in=['pending', 'processing', 'confirmed']
            ).first()
            if booking:
                return booking.id
        return None

    def get_booking_status(self, obj):
        """Return the booking status for the current authenticated user (if any)"""
        from .models import Booking
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = Booking.objects.filter(
                property=obj,
                user=request.user,
                status__in=['pending', 'processing', 'confirmed']
            ).first()
            if booking:
                return booking.status
        return None

    @property
    def _get_current_booking(self):
        """Helper to get current user's booking"""
        from .models import Booking
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = Booking.objects.filter(
                property=self.instance,
                user=request.user,
                status__in=['pending', 'processing', 'confirmed']
            ).first()
            return booking
        return None

    def get_booking_check_in(self, obj):
        """Return booking check-in date for current user"""
        from .models import Booking
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = Booking.objects.filter(
                property=obj,
                user=request.user,
                status__in=['pending', 'processing', 'confirmed']
            ).first()
            if booking:
                return booking.check_in
        return None

    def get_booking_check_out(self, obj):
        """Return booking check-out date for current user"""
        from .models import Booking
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = Booking.objects.filter(
                property=obj,
                user=request.user,
                status__in=['pending', 'processing', 'confirmed']
            ).first()
            if booking:
                return booking.check_out
        return None

    def get_booking_total_price(self, obj):
        """Return booking total price for current user"""
        from .models import Booking
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = Booking.objects.filter(
                property=obj,
                user=request.user,
                status__in=['pending', 'processing', 'confirmed']
            ).first()
            if booking:
                return booking.total_price
        return None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.first_name or obj.owner.username
        return None

    def get_landlord_name(self, obj):
        if obj.landlord:
            return obj.landlord.name
        return None


# =====================================================
# BOOKING SERIALIZERS
# =====================================================
class BookingSerializer(serializers.ModelSerializer):
    """Basic booking serializer for create/update"""
    
    class Meta:
        model = Booking
        fields = ["id", "property", "check_in", "check_out", "total_price", "status"]
        read_only_fields = ["id", "status"]


class BookingDetailSerializer(serializers.ModelSerializer):
    """Detailed booking serializer with property and user info"""
    property_info = serializers.SerializerMethodField()
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "user_info",
            "property_info",
            "check_in",
            "check_out",
            "total_price",
            "status",
            "payment_method",
            "payment_status",
            "payment_type",
            "esewa_ref_id",
            "esewa_transaction_id",
            "created_at",
            "updated_at"
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_property_info(self, obj):
        """Return property details with images"""
        images = []
        if obj.property.images.exists():
            images = PropertyImageSerializer(obj.property.images.all(), many=True).data
        
        return {
            "id": obj.property.id,
            "title": obj.property.title,
            "address": obj.property.address,
            "city": obj.property.city,
            "price": obj.property.price,
            "property_type": obj.property.property_type,
            "images": images,
        }

    def get_user_info(self, obj):
        """Return user (tenant) details with KYC and phone"""
        phone = ''
        kyc_status = 'not_submitted'
        try:
            kyc = obj.user.kyc
            phone = kyc.phone_number or ''
            kyc_status = kyc.status
        except:
            pass
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
            "phone": phone,
            "kyc_status": kyc_status,
        }


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings"""

    class Meta:
        model = Booking
        fields = ["id", "property", "check_in", "check_out", "total_price", "payment_type"]

    def validate(self, attrs):
        """Validate booking dates"""
        if attrs["check_in"] >= attrs["check_out"]:
            raise serializers.ValidationError("Check-out date must be after check-in date")
        return attrs


# =====================================================
# FAVORITE SERIALIZERS
# =====================================================
class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for user favorites"""
    property_info = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = ["id", "property_info", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_property_info(self, obj):
        """Return property details"""
        return {
            "id": obj.property.id,
            "title": obj.property.title,
            "description": obj.property.description,
            "property_type": obj.property.property_type,
            "address": obj.property.address,
            "city": obj.property.city,
            "price": str(obj.property.price),
            "available": obj.property.available,
            "images": PropertyImageSerializer(obj.property.images.all(), many=True).data,
        }


class FavoriteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/removing favorites"""

    class Meta:
        model = Favorite
        fields = ["property"]


# =====================================================
# VIEWED PROPERTY SERIALIZERS
# =====================================================
class ViewedPropertySerializer(serializers.ModelSerializer):
    """Serializer for viewed properties"""
    property_info = serializers.SerializerMethodField()

    class Meta:
        model = ViewedProperty
        fields = ["id", "property_info", "view_count", "last_viewed", "created_at"]
        read_only_fields = ["id", "last_viewed", "created_at"]

    def get_property_info(self, obj):
        """Return property details"""
        return {
            "id": obj.property.id,
            "title": obj.property.title,
            "description": obj.property.description,
            "property_type": obj.property.property_type,
            "address": obj.property.address,
            "city": obj.property.city,
            "price": str(obj.property.price),
            "available": obj.property.available,
            "images": PropertyImageSerializer(obj.property.images.all(), many=True).data,
        }


# =====================================================
# CANCELLATION & REFUND SERIALIZERS
# =====================================================
class CancellationPolicySerializer(serializers.ModelSerializer):
    """Serializer for cancellation policy"""
    
    class Meta:
        model = CancellationPolicy
        fields = [
            'id',
            'full_refund_days',
            'partial_refund_days',
            'partial_refund_percentage',
            'platform_fee_percentage',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RefundSerializer(serializers.ModelSerializer):
    """Serializer for refund information"""
    
    class Meta:
        model = Refund
        fields = [
            'id',
            'booking',
            'payment',
            'refund_amount',
            'refund_percentage',
            'status',
            'reason',
            'policy_applied',
            'requested_at',
            'processed_at'
        ]
        read_only_fields = ['id', 'requested_at', 'processed_at']


class RefundDetailSerializer(serializers.ModelSerializer):
    """Serializer for refunds with booking, tenant, and property details"""
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    tenant_name = serializers.SerializerMethodField()
    tenant_email = serializers.SerializerMethodField()
    property_name = serializers.SerializerMethodField()
    property_city = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = [
            'id', 'booking_id', 'tenant_name', 'tenant_email',
            'property_name', 'property_city',
            'paid_amount', 'refund_amount', 'refund_percentage',
            'remaining_amount', 'status', 'payment_status',
            'policy_applied', 'reason', 'requested_at', 'processed_at'
        ]
        read_only_fields = fields

    def get_tenant_name(self, obj):
        u = obj.booking.user
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_tenant_email(self, obj):
        return obj.booking.user.email

    def get_property_name(self, obj):
        return obj.booking.property.title

    def get_property_city(self, obj):
        return obj.booking.property.city

    def get_paid_amount(self, obj):
        return str(obj.payment.amount)

    def get_remaining_amount(self, obj):
        paid = float(obj.payment.amount)
        refunded = float(obj.refund_amount)
        return str(max(0, paid - refunded))

    def get_payment_status(self, obj):
        return obj.payment.status


class CancellationSerializer(serializers.ModelSerializer):
    """Serializer for cancellation record"""
    refund = RefundSerializer(read_only=True)
    
    class Meta:
        model = Cancellation
        fields = [
            'id',
            'booking',
            'cancelled_by',
            'reason',
            'cancelled_at',
            'refund'
        ]
        read_only_fields = ['id', 'cancelled_at']


class BookingCancellationResponseSerializer(serializers.Serializer):
    """Serializer for booking cancellation response"""
    
    booking_id = serializers.IntegerField()
    status = serializers.CharField()
    refund_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    refund_percentage = serializers.IntegerField()
    policy_applied = serializers.CharField()
    message = serializers.CharField()


class CancellationPolicyInfoSerializer(serializers.Serializer):
    """Serializer to display cancellation policy info to tenant before booking"""
    
    full_refund_days = serializers.IntegerField()
    partial_refund_days = serializers.IntegerField()
    partial_refund_percentage = serializers.IntegerField()
    
    # Calculated fields
    full_refund_description = serializers.SerializerMethodField()
    partial_refund_description = serializers.SerializerMethodField()
    no_refund_description = serializers.SerializerMethodField()
    
    def get_full_refund_description(self, obj):
        return f"Full refund if you cancel {obj['full_refund_days']} or more days before check-in"
    
    def get_partial_refund_description(self, obj):
        return (
            f"{obj['partial_refund_percentage']}% refund if you cancel "
            f"{obj['partial_refund_days']}-{obj['full_refund_days']-1} days before check-in"
        )
    
    def get_no_refund_description(self, obj):
        return f"No refund if you cancel less than {obj['partial_refund_days']} days before check-in"


# =====================================================
# MODERATION SERIALIZERS
# =====================================================

class WarningSerializer(serializers.ModelSerializer):
    """Serializer for admin warnings"""
    issued_by_name = serializers.SerializerMethodField()
    reason_display = serializers.SerializerMethodField()

    class Meta:
        model = Warning
        fields = [
            'id', 'user', 'issued_by', 'issued_by_name',
            'reason', 'reason_display', 'custom_reason', 'message',
            'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'issued_by', 'created_at']

    def get_issued_by_name(self, obj):
        if obj.issued_by:
            return f"{obj.issued_by.first_name} {obj.issued_by.last_name}".strip() or obj.issued_by.username
        return "System"

    def get_reason_display(self, obj):
        return obj.get_reason_display()


class WarningCreateSerializer(serializers.Serializer):
    """Serializer for creating a warning"""
    reason = serializers.ChoiceField(choices=Warning.WARNING_REASONS)
    custom_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    message = serializers.CharField()


class SuspensionSerializer(serializers.ModelSerializer):
    """Serializer for suspensions"""
    issued_by_name = serializers.SerializerMethodField()
    lifted_by_name = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()

    class Meta:
        model = Suspension
        fields = [
            'id', 'user', 'issued_by', 'issued_by_name',
            'reason', 'duration', 'duration_display', 'expires_at',
            'is_active', 'lifted_at', 'lifted_by', 'lifted_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'issued_by', 'created_at', 'lifted_at', 'lifted_by']

    def get_issued_by_name(self, obj):
        if obj.issued_by:
            return f"{obj.issued_by.first_name} {obj.issued_by.last_name}".strip() or obj.issued_by.username
        return "System"

    def get_lifted_by_name(self, obj):
        if obj.lifted_by:
            return f"{obj.lifted_by.first_name} {obj.lifted_by.last_name}".strip() or obj.lifted_by.username
        return None

    def get_duration_display(self, obj):
        return obj.get_duration_display()


class SuspensionCreateSerializer(serializers.Serializer):
    """Serializer for creating a suspension"""
    reason = serializers.CharField()
    duration = serializers.ChoiceField(choices=Suspension.DURATION_CHOICES)


class ModerationActionSerializer(serializers.ModelSerializer):
    """Serializer for moderation audit log"""
    admin_name = serializers.SerializerMethodField()
    action_type_display = serializers.SerializerMethodField()

    class Meta:
        model = ModerationAction
        fields = [
            'id', 'user', 'admin', 'admin_name',
            'action_type', 'action_type_display', 'reason',
            'details', 'created_at',
        ]
        read_only_fields = fields

    def get_admin_name(self, obj):
        if obj.admin:
            return f"{obj.admin.first_name} {obj.admin.last_name}".strip() or obj.admin.username
        return "System"

    def get_action_type_display(self, obj):
        return obj.get_action_type_display()


# =====================================================
# NOTIFICATION SERIALIZERS
# =====================================================
class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'notification_type',
            'title',
            'message',
            'related_entity_type',
            'related_entity_id',
            'is_read',
            'created_at'
        ]
        read_only_fields = ['id', 'recipient', 'created_at']


# =====================================================
# RENTAL AGREEMENT SERIALIZERS
# =====================================================
class RentalAgreementSerializer(serializers.ModelSerializer):
    """Serializer for rental agreements"""

    class Meta:
        model = RentalAgreement
        fields = '__all__'
        read_only_fields = [
            'id', 'booking', 'property', 'tenant', 'landlord',
            'agreement_content', 'monthly_rent', 'security_deposit',
            'lease_duration_months', 'tenant_name', 'tenant_email',
            'tenant_phone', 'tenant_citizenship', 'landlord_name',
            'landlord_email', 'landlord_phone', 'landlord_kyc_verified',
            'property_name', 'property_address', 'property_type',
            'transaction_id', 'payment_date', 'amount_paid',
            'tenant_signature', 'tenant_signed_at', 'tenant_ip_address',
            'tenant_device_info', 'landlord_signature',
            'landlord_signed_at', 'landlord_ip_address',
            'landlord_device_info', 'agreement_pdf',
            'created_at', 'updated_at',
        ]


class RentalAgreementListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing agreements"""
    tenant_name = serializers.CharField(read_only=True)
    landlord_name = serializers.CharField(read_only=True)
    property_name = serializers.CharField(read_only=True)

    class Meta:
        model = RentalAgreement
        fields = [
            'id', 'status', 'monthly_rent', 'security_deposit',
            'tenant_name', 'landlord_name', 'property_name',
            'tenant_signed_at', 'landlord_signed_at',
            'created_at', 'updated_at',
        ]


class TenantSignSerializer(serializers.Serializer):
    """Serializer for tenant signature submission"""
    signature = serializers.CharField(help_text="Base64 encoded signature image")
    ip_address = serializers.CharField(required=False, allow_blank=True, default='')
    device_info = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_signature(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError("Invalid signature format. Must be a base64 data URL.")
        return value


# =====================================================
# FORGOT / RESET PASSWORD SERIALIZERS
# =====================================================

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email address.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return data


class LandlordSignSerializer(serializers.Serializer):
    """Serializer for landlord signature submission"""
    signature = serializers.CharField(help_text="Base64 encoded signature image")
    ip_address = serializers.CharField(required=False, allow_blank=True, default='')
    device_info = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_signature(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError("Invalid signature format. Must be a base64 data URL.")
        return value