import secrets

from rest_framework import generics, permissions, views, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

from django.utils import timezone
from django.core.mail import send_mail
from django.db.models import Q
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    Profile, KYC, Property, PropertyImage, Booking, Favorite, ViewedProperty, LandlordUser,
    CancellationPolicy, Payment, Refund, Cancellation, Notification,
    Warning, Suspension, ModerationAction, RentalAgreement, PaymentFailureInquiry,
)
from .serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    KYCSerializer,
    KYCStatusSerializer,
    PropertyCreateSerializer,
    PropertyUpdateSerializer,
    KYCListSerializer,
    KYCUpdateStatusSerializer,
    PropertySerializer,
    BookingSerializer,
    BookingDetailSerializer,
    BookingCreateSerializer,
    RefundDetailSerializer,
    FavoriteSerializer,
    FavoriteCreateSerializer,
    ViewedPropertySerializer,
    LandlordRegisterSerializer,
    LandlordLoginSerializer,
    LandlordSerializer,
    WarningSerializer,
    WarningCreateSerializer,
    SuspensionSerializer,
    SuspensionCreateSerializer,
    ModerationActionSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)
from .permissions import IsAdminUser
from .services.esewa_service import EsewaPaymentService, create_esewa_payment_link
from rest_framework.views import APIView
from django.db import transaction
from django.conf import settings

# ----------------------
# REGISTER USER
# ----------------------
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def perform_create(self, serializer):
        import random
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags

        user = serializer.save()

        # ✅ Ensure profile exists
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.email_verified = False
        code = f"{random.randint(100000, 999999)}"
        profile.set_verification_code(code, minutes=10)

        html_message = render_to_string('emails/verify_email.html', {
            'user': user,
            'verification_code': code,
        })
        plain_message = strip_tags(html_message)

        send_mail(
            "Your StayEasy verification code",
            plain_message,
            None,
            [user.email],
            fail_silently=False,
            html_message=html_message,
        )


# ----------------------
# VERIFY EMAIL
# ----------------------
class VerifyEmailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User with this email not found"}, status=400)

        profile, _ = Profile.objects.get_or_create(user=user)

        if profile.email_verified:
            return Response({"message": "Email already verified"})

        if profile.email_verification_code != code:
            return Response({"error": "Invalid verification code"}, status=400)

        if timezone.now() > profile.email_verification_expires:
            return Response({"error": "Verification code has expired. Please request a new one."}, status=400)

        profile.email_verified = True
        profile.clear_verification_code()
        return Response({"message": "Email verified successfully"})


# =====================================================
# LANDLORD AUTHENTICATION VIEWS
# =====================================================

# ----------------------
# LANDLORD REGISTER
# ----------------------
class LandlordRegisterView(generics.CreateAPIView):
    queryset = LandlordUser.objects.all()
    serializer_class = LandlordRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        landlord = serializer.save()
        # Email verification can be added here if needed


# ----------------------
# LANDLORD LOGIN
# ----------------------
class LandlordLoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LandlordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get("email")
        password = serializer.validated_data.get("password")

        try:
            landlord = LandlordUser.objects.get(email__iexact=email)
        except LandlordUser.DoesNotExist:
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check password
        from django.contrib.auth.hashers import check_password
        if not check_password(password, landlord.password):
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not landlord.is_active:
            return Response(
                {"error": "Account is inactive"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate JWT tokens manually for LandlordUser
        # We'll use a custom token approach
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken()
        refresh.payload.update({
            'landlord_id': landlord.id,
            'email': landlord.email,
            'name': landlord.name,
            'type': 'landlord',
        })

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "landlord": {
                "id": landlord.id,
                "email": landlord.email,
                "name": landlord.name,
                "business_name": landlord.business_name,
                "phone": landlord.phone,
            }
        }, status=status.HTTP_200_OK)


# ----------------------
# LANDLORD PROFILE
# ----------------------
class LandlordProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Extract landlord_id from token
        landlord_id = request.auth.payload.get('landlord_id')
        
        if not landlord_id:
            return Response(
                {"error": "Not a landlord account"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            landlord = LandlordUser.objects.get(id=landlord_id)
            serializer = LandlordSerializer(landlord)
            return Response(serializer.data)
        except LandlordUser.DoesNotExist:
            return Response(
                {"error": "Landlord not found"},
                status=status.HTTP_404_NOT_FOUND
            )


# =====================================================
# LANDLORD PROPERTY MANAGEMENT VIEWS
# =====================================================

# ----------------------
# LANDLORD CREATE PROPERTY
# ----------------------
class LandlordPropertyCreateView(generics.CreateAPIView):
    serializer_class = PropertyCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Use PropertyCreateSerializer for input, PropertySerializer for response"""
        if self.request.method == 'POST':
            return PropertyCreateSerializer
        return PropertySerializer

    def perform_create(self, serializer):
        # Check if user is suspended
        user_obj = getattr(self.request, 'user', None)
        if user_obj and user_obj.is_authenticated:
            active_suspension = Suspension.objects.filter(user=user_obj, is_active=True).first()
            if active_suspension:
                raise ValidationError({
                    "error": "Your account is suspended. You cannot list properties.",
                    "suspension": SuspensionSerializer(active_suspension).data,
                })

        # Try to get landlord from JWT payload, fallback to authenticated user, fallback to email match
        payload = getattr(getattr(self.request, 'auth', None), 'payload', None)
        landlord = None

        # 1. Try landlord_id from JWT
        landlord_id = None
        if payload and 'landlord_id' in payload:
            landlord_id = payload['landlord_id']
            try:
                landlord = LandlordUser.objects.get(id=landlord_id)
            except LandlordUser.DoesNotExist:
                landlord = None

        # 2. Fallback: authenticated user with LandlordUser entry (by email)
        if not landlord and hasattr(self.request, 'user') and self.request.user.is_authenticated:
            try:
                landlord = LandlordUser.objects.get(email__iexact=self.request.user.email)
            except LandlordUser.DoesNotExist:
                landlord = None

        # 3. Fallback: any LandlordUser with same email as provided in payload (if present)
        if not landlord and payload and 'email' in payload:
            try:
                landlord = LandlordUser.objects.get(email__iexact=payload['email'])
            except LandlordUser.DoesNotExist:
                landlord = None

        # If landlord found, save with landlord + owner
        if landlord:
            owner_user = getattr(self.request, 'user', None)
            if not owner_user or not owner_user.is_authenticated:
                owner_user = User.objects.filter(email__iexact=landlord.email).first()
            if owner_user:
                serializer.save(owner=owner_user, landlord=landlord)
                return

        # If not, fallback to normal Django user as owner
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            serializer.save(owner=user, landlord=None)
            return

        # If neither, raise error
        raise ValidationError({"error": "Not authenticated as landlord or user. (DEBUG: payload=%s)" % payload})


# ----------------------
# LANDLORD LIST/RETRIEVE PROPERTIES
# ----------------------
class LandlordPropertyListView(generics.ListAPIView):
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        landlord_id = self.request.auth.payload.get('landlord_id')
        if not landlord_id:
            return Property.objects.none()
        return Property.objects.filter(landlord_id=landlord_id).order_by('-created_at')


class LandlordPropertyDetailView(generics.RetrieveAPIView):
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        landlord_id = self.request.auth.payload.get('landlord_id')
        if not landlord_id:
            return Property.objects.none()
        return Property.objects.filter(landlord_id=landlord_id)


# ----------------------
# LANDLORD UPDATE PROPERTY
# ----------------------
class LandlordPropertyUpdateView(generics.UpdateAPIView):
    serializer_class = PropertyUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    http_method_names = ['patch', 'put']

    def get_queryset(self):
        user = self.request.user
        landlord_id = self.request.auth.payload.get('landlord_id')
        if landlord_id:
            return Property.objects.filter(landlord_id=landlord_id)
        return Property.objects.filter(owner=user)

    def perform_update(self, serializer):
        landlord_id = self.request.auth.payload.get('landlord_id')
        if landlord_id:
            try:
                landlord = LandlordUser.objects.get(id=landlord_id)
            except LandlordUser.DoesNotExist:
                raise ValidationError({"error": "Landlord not found."})
            serializer.save(landlord=landlord)
        else:
            serializer.save()

    def get_serializer_class(self):
        """Use PropertyUpdateSerializer for input, PropertySerializer for response"""
        if self.request.method in ['PATCH', 'PUT']:
            return PropertyUpdateSerializer
        return PropertySerializer


# ----------------------
# LANDLORD DELETE PROPERTY
# ----------------------
class LandlordPropertyDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        landlord_id = self.request.auth.payload.get('landlord_id')
        if not landlord_id:
            return Property.objects.none()
        return Property.objects.filter(landlord_id=landlord_id)


# ----------------------
# LANDLORD VIEW BOOKINGS FOR PROPERTY (status only)
# ----------------------
class LandlordPropertyBookingsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'property_id'
    lookup_url_kwarg = 'property_id'

    def get(self, request, *args, **kwargs):
        landlord_id = request.auth.payload.get('landlord_id')
        property_id = kwargs.get('property_id')

        if not landlord_id:
            return Response(
                {"error": "Not a landlord account"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify property belongs to landlord
        try:
            property_obj = Property.objects.get(id=property_id, landlord_id=landlord_id)
        except Property.DoesNotExist:
            return Response(
                {"error": "Property not found or access denied"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get bookings for this property (only return dates and status, no user personal data)
        bookings = Booking.objects.filter(property=property_obj).values(
            'id', 'check_in', 'check_out', 'status', 'payment_status', 'total_price', 'created_at'
        ).order_by('-created_at')

        return Response(list(bookings))


# ----------------------
# LOGIN WITH JWT
# ----------------------
class CustomTokenObtainPairView(TokenObtainPairView):

    def post(self, request, *args, **kwargs):
        email_or_username = request.data.get("email")
        password = request.data.get("password")

        # Get user by email or username
        user = User.objects.filter(email=email_or_username).first() or \
               User.objects.filter(username=email_or_username).first()

        if not user:
            return Response({"error": "Invalid email or password"}, status=401)

        # ✅ Ensure profile exists
        profile, _ = Profile.objects.get_or_create(user=user)

        # Enforce email verification (admin/superuser bypasses)
        if not user.is_superuser and not profile.email_verified:
            return Response({"error": "Email not verified"}, status=403)

        # Attach username for JWT authenticate
        request.data["username"] = user.username
        user_auth = authenticate(username=user.username, password=password)
        if user_auth is None:
            return Response({"error": "Invalid email or password"}, status=401)

        # Get token response
        response = super().post(request, *args, **kwargs)

        # Add role info
        response.data["role"] = "admin" if user.is_superuser or profile.role == "admin" else profile.user_type

        return response


# ----------------------
# PROFILE
# ----------------------
class ProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "role": "admin" if request.user.is_superuser or profile.role == "admin" else profile.role,
            "user_type": profile.user_type,
            "email_verified": profile.email_verified,
            "phone": profile.phone,
            "date_of_birth": profile.date_of_birth,
            "address": profile.address,
            "emergency_contact": profile.emergency_contact,
            "profile_picture": f"/uploads/{profile.profile_picture.name}" if profile.profile_picture else None,
        })

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        data = request.data

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        if first_name:
            request.user.first_name = first_name
        if last_name:
            request.user.last_name = last_name
        request.user.save()

        phone = data.get("phone")
        if phone is not None:
            profile.phone = phone

        date_of_birth = data.get("date_of_birth")
        if date_of_birth is not None:
            profile.date_of_birth = date_of_birth or None

        address = data.get("address")
        if address is not None:
            profile.address = address

        emergency_contact = data.get("emergency_contact")
        if emergency_contact is not None:
            profile.emergency_contact = emergency_contact

        profile_picture = request.FILES.get("profile_picture")
        if profile_picture:
            profile.profile_picture = profile_picture

        profile.save()
        return Response({"message": "Profile updated successfully"})


# ----------------------
# CHANGE PASSWORD
# ----------------------
class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            raise ValidationError({'error': 'Both old and new password are required.'})

        if not user.check_password(old_password):
            raise ValidationError({'error': 'Old password is incorrect.'})

        if len(new_password) < 8:
            raise ValidationError({'error': 'Password must be at least 8 characters.'})

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'})


# ----------------------
# KYC SUBMIT
# ----------------------
class KYCSubmitView(generics.CreateAPIView):
    serializer_class = KYCSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"KYC submit by user {request.user.id}, files: {list(request.FILES.keys())}, data: {request.data.keys() if hasattr(request.data, 'keys') else 'N/A'}")
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"KYC submit failed for user {request.user.id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    def perform_create(self, serializer):
        if KYC.objects.filter(user=self.request.user).exists():
            raise ValidationError({"error": "KYC already submitted"})
        serializer.save(user=self.request.user)


# ----------------------
# KYC STATUS
# ----------------------
class KYCStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            kyc = request.user.kyc
            serializer = KYCStatusSerializer(kyc)
            return Response(serializer.data)
        except KYC.DoesNotExist:
            return Response({"status": "not_submitted"})


# ----------------------
# KYC DETAIL (own)
# ----------------------
class KYCDetailView(APIView):
    """Return full KYC info for the logged-in user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            kyc = request.user.kyc
            return Response({
                "id": kyc.id,
                "full_name": kyc.full_name,
                "phone_number": kyc.phone_number,
                "citizenship_number": kyc.citizenship_number,
                "document_image": f"/uploads/{kyc.document_image.name}" if kyc.document_image else None,
                "document_back_image": f"/uploads/{kyc.document_back_image.name}" if kyc.document_back_image else None,
                "selfie_image": f"/uploads/{kyc.selfie_image.name}" if kyc.selfie_image else None,
                "status": kyc.status,
                "submitted_at": kyc.submitted_at,
                "verified_by": {
                    "id": kyc.verified_by.id,
                    "name": f"{kyc.verified_by.first_name} {kyc.verified_by.last_name}",
                } if kyc.verified_by else None,
                "verified_at": kyc.verified_at,
            })
        except KYC.DoesNotExist:
            return Response({"status": "not_submitted"})


# ----------------------
# PROPERTY CREATE
# ----------------------
class PropertyCreateView(generics.CreateAPIView):
    serializer_class = PropertyCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.profile.user_type != "owner":
            raise ValidationError({"error": "Only landlords can add property"})

        try:
            if user.kyc.status != "approved":
                raise ValidationError({"error": "KYC must be approved to add property"})
        except KYC.DoesNotExist:
            raise ValidationError({"error": "KYC not submitted"})

        serializer.save(owner=user)


# ----------------------
# ADMIN KYC MANAGEMENT
# ----------------------
class AdminKYCListView(generics.ListAPIView):
    """Admin: View all KYC requests with filtering by status"""
    queryset = KYC.objects.all().order_by('-submitted_at')
    serializer_class = KYCListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Filter by status if provided in query params, exclude test users"""
        # Exclude test users: testuser, testuser2, and test* patterns
        queryset = KYC.objects.exclude(
            user__username__in=['testuser', 'testuser2', 'test', 'test23', 'test00', 'test001', 'test55']
        ).exclude(
            user__username__istartswith='test'
        ).order_by('-submitted_at')
        
        status_filter = self.request.query_params.get('status')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset


class AdminKYCDetailView(generics.RetrieveAPIView):
    """Admin: Get details of a specific KYC request"""
    queryset = KYC.objects.all()
    serializer_class = KYCListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    lookup_field = 'id'


class AdminKYCUpdateStatusView(generics.UpdateAPIView):
    """Admin: Update KYC status (approve/reject)"""
    queryset = KYC.objects.all()
    serializer_class = KYCUpdateStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    lookup_field = 'id'
    http_method_names = ['patch', 'put']

    @transaction.atomic
    def perform_update(self, serializer):
        """Update KYC status and record which admin verified it"""
        kyc = self.get_object()
        
        # Update status
        serializer.save(
            verified_by=self.request.user,
            verified_at=timezone.now()
        )
        
        # Send notification email to user based on status
        new_status = serializer.validated_data.get('status')
        
        if new_status == 'approved':
            send_mail(
                "KYC Approved ✓",
                f"Congratulations {kyc.user.first_name}!\n\nYour KYC has been approved. You can now add properties.",
                "noreply@stayeasy.com",
                [kyc.user.email],
                fail_silently=True
            )
        elif new_status == 'rejected':
            send_mail(
                "KYC Rejected",
                f"Dear {kyc.user.first_name},\n\nYour KYC submission was rejected. Please verify your documents and resubmit.",
                "noreply@stayeasy.com",
                [kyc.user.email],
                fail_silently=True
            )
    
    def patch(self, request, *args, **kwargs):
        """Allow partial updates (status only)"""
        return super().patch(request, *args, **kwargs)


class AdminKYCStatsView(APIView):
    """Admin: Get KYC statistics (pending, approved, rejected counts)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        # Exclude test users from stats
        kyc_queryset = KYC.objects.exclude(
            user__username__in=['testuser', 'testuser2', 'test', 'test23', 'test00', 'test001', 'test55']
        ).exclude(
            user__username__istartswith='test'
        )
        
        total = kyc_queryset.count()
        pending = kyc_queryset.filter(status='pending').count()
        approved = kyc_queryset.filter(status='approved').count()
        rejected = kyc_queryset.filter(status='rejected').count()

        return Response({
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
        })


# ----------------------
# PROPERTY LIST - FOR ALL USERS
# ----------------------
class PropertyListView(generics.ListAPIView):
    """Get all published properties (public homepage)"""
    queryset = Property.objects.filter(status='published').order_by('-created_at')
    serializer_class = PropertySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """Filter by property_type and/or status if provided"""
        # Only show published properties to public users
        queryset = Property.objects.filter(status='published').order_by('-created_at')
        property_type = self.request.query_params.get('type')
        
        if property_type:
            queryset = queryset.filter(property_type=property_type)
        
        return queryset


# ----------------------
# PROPERTY DETAIL
# ----------------------
class PropertyDetailView(generics.RetrieveAPIView):
    """Get single property details"""
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'


# ----------------------
# CHECK BOOKING AVAILABILITY
# ----------------------
class CheckBookingAvailabilityView(APIView):
    """Check if a property is available for given dates"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Check if property is available
        Request: {
            "property_id": 1,
            "check_in": "2026-05-10",
            "check_out": "2026-05-15"
        }
        """
        try:
            property_id = request.data.get('property_id')
            check_in_str = request.data.get('check_in')
            check_out_str = request.data.get('check_out')
            
            if not all([property_id, check_in_str, check_out_str]):
                return Response(
                    {"error": "Missing required fields: property_id, check_in, check_out"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from datetime import datetime
            check_in = datetime.strptime(check_in_str, '%Y-%m-%d').date()
            check_out = datetime.strptime(check_out_str, '%Y-%m-%d').date()
            
            # Check for overlapping active bookings
            conflicts = Booking.objects.filter(
                property_id=property_id,
                status__in=['pending', 'processing', 'confirmed']
            ).filter(
                Q(check_in__lt=check_out) & Q(check_out__gt=check_in)
            )
            
            if conflicts.exists():
                conflicting_booking = conflicts.first()
                return Response({
                    "available": False,
                    "message": f"Property is booked from {conflicting_booking.check_in} to {conflicting_booking.check_out}",
                    "booked_from": str(conflicting_booking.check_in),
                    "booked_to": str(conflicting_booking.check_out),
                }, status=status.HTTP_200_OK)
            
            return Response({
                "available": True,
                "message": "Property is available for these dates",
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {"error": f"Invalid date format. Use YYYY-MM-DD: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ----------------------
# ADMIN - VIEW ALL PROPERTIES
# ----------------------
class AdminPropertyListView(generics.ListAPIView):
    """Admin: View all properties for monitoring"""
    queryset = Property.objects.all().order_by('-created_at')
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Filter by owner, property_type, or available status"""
        queryset = Property.objects.all().order_by('-created_at')
        
        property_type = self.request.query_params.get('type')
        if property_type:
            queryset = queryset.filter(property_type=property_type)
        
        available_only = self.request.query_params.get('available')
        if available_only == 'true':
            queryset = queryset.filter(available=True)
        
        return queryset


# ----------------------
# LANDLORD - GET THEIR PROPERTIES
# ----------------------
class LandlordPropertyListView(generics.ListAPIView):
    """Landlord: View their own properties"""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get only properties owned by the current user"""
        return Property.objects.filter(owner=self.request.user).order_by('-created_at')


# ----------------------
# PROPERTY UPDATE
# ----------------------
class PropertyUpdateView(generics.UpdateAPIView):
    """Landlord: Update their own property"""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Only allow landlords to update their own properties"""
        return Property.objects.filter(owner=self.request.user)

    def perform_update(self, serializer):
        """Ensure owner cannot be changed"""
        serializer.save(owner=self.request.user)


# ----------------------
# PROPERTY DELETE
# ----------------------
class PropertyDeleteView(generics.DestroyAPIView):
    """Landlord: Delete their own property"""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Only allow landlords to delete their own properties"""
        return Property.objects.filter(owner=self.request.user)

    def perform_destroy(self, instance):
        """Delete property and associated images"""
        instance.delete()


# ----------------------
# LANDLORD - DASHBOARD STATS
# ----------------------
class LandlordDashboardView(APIView):
    """Landlord: Get dashboard stats (properties, bookings, KYC status, revenue)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Try landlord_id from JWT first (for LandlordUser accounts)
        try:
            landlord_id = request.auth.payload.get('landlord_id')
        except AttributeError:
            landlord_id = None
        
        if landlord_id:
            properties = Property.objects.filter(landlord_id=landlord_id)
        else:
            properties = Property.objects.filter(owner=user)
        
        # Get KYC status
        kyc_status = "not_submitted"
        try:
            kyc = user.kyc
            kyc_status = kyc.status
        except KYC.DoesNotExist:
            pass

        total_properties = properties.count()
        available_properties = properties.filter(available=True).count()

        return Response({
            "kyc_status": kyc_status,
            "total_properties": total_properties,
            "available_properties": available_properties,
            "can_add_property": kyc_status == "approved"
        })


# ----------------------
# BOOKING - USER CREATE
# ----------------------
class BookingCreateView(generics.CreateAPIView):
    """User: Create a new booking"""
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """Override create to provide better error messages"""
        # Check if user is suspended
        active_suspension = Suspension.objects.filter(user=request.user, is_active=True).first()
        if active_suspension:
            return Response({
                "error": "Your account is suspended. You cannot create bookings.",
                "suspension": SuspensionSerializer(active_suspension).data,
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        # Save booking with current user
        user = self.request.user
        
        # Check for duplicate/overlapping bookings
        property_obj = serializer.validated_data.get('property')
        check_in = serializer.validated_data.get('check_in')
        check_out = serializer.validated_data.get('check_out')
        
        # Check if user already has ANY booking for this property with overlapping dates
        # or exact same dates - prevent all cases
        existing = Booking.objects.filter(
            property=property_obj,
            status__in=['pending', 'processing', 'confirmed']  # Check active bookings
        ).filter(
            # Check for overlapping date ranges
            # Overlap occurs if: check_in < existing.check_out AND check_out > existing.check_in
            Q(check_in__lt=check_out) & Q(check_out__gt=check_in)
        )
        
        if existing.exists():
            overlapping_booking = existing.first()
            raise ValidationError({
                "error": f"This property is already booked from {overlapping_booking.check_in} to {overlapping_booking.check_out}. Please select different dates."
            })
        
        # Additional check: prevent user from booking same property twice (any dates) with active bookings
        user_existing = Booking.objects.filter(
            user=user,
            property=property_obj,
            status__in=['pending', 'processing', 'confirmed']
        ).exists()
        
        if user_existing:
            raise ValidationError({
                "error": "You already have an active booking for this property. Please complete or cancel it first."
            })
        
        booking = serializer.save(user=user, status='pending', payment_status='unpaid')



# ----------------------
# BOOKING - USER LIST
# ----------------------
class UserBookingListView(generics.ListAPIView):
    """User: Get their own bookings (active only by default)"""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get only active bookings made by the current user (exclude cancelled)"""
        user = self.request.user
        # Exclude cancelled bookings from the default view
        # Users can optionally view cancelled bookings via a separate endpoint if needed
        return Booking.objects.filter(
            user=user,
            status__in=['pending', 'processing', 'confirmed', 'completed']
        ).order_by('-created_at')


# ----------------------
# BOOKING - LANDLORD LIST
# ----------------------
class LandlordBookingListView(generics.ListAPIView):
    """Landlord: Get bookings for their properties"""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get bookings for all properties owned by the current landlord (owner OR landlord FK)"""
        user = self.request.user
        
        # Try landlord_id from JWT first (for LandlordUser accounts)
        try:
            landlord_id = self.request.auth.payload.get('landlord_id')
        except AttributeError:
            landlord_id = None
        
        if landlord_id:
            properties = Property.objects.filter(landlord_id=landlord_id)
        else:
            properties = Property.objects.filter(owner=user)
        
        return Booking.objects.filter(property__in=properties).order_by('-created_at')


# ----------------------
# LANDLORD - TENANT PAYMENT HISTORY
# ----------------------
class LandlordTenantPaymentHistoryView(generics.ListAPIView):
    """Landlord: Get payment history for a specific tenant's bookings"""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get bookings (with payment info) for a specific tenant and landlord's properties"""
        user = self.request.user
        tenant_id = self.kwargs.get('tenant_id')
        
        # Try landlord_id from JWT first (for LandlordUser accounts)
        try:
            landlord_id = self.request.auth.payload.get('landlord_id')
        except AttributeError:
            landlord_id = None
        
        if landlord_id:
            properties = Property.objects.filter(landlord_id=landlord_id)
        else:
            properties = Property.objects.filter(owner=user)
        
        return Booking.objects.filter(
            user_id=tenant_id,
            property__in=properties
        ).order_by('-created_at')


class LandlordPaymentHistoryView(generics.ListAPIView):
    """Landlord: Get all payment records across all tenants"""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return completed/payment bookings for all the landlord's properties"""
        user = self.request.user
        try:
            landlord_id = self.request.auth.payload.get('landlord_id')
        except AttributeError:
            landlord_id = None

        if landlord_id:
            properties = Property.objects.filter(landlord_id=landlord_id)
        else:
            properties = Property.objects.filter(owner=user)

        return Booking.objects.filter(
            property__in=properties,
            payment_status='completed'
        ).order_by('-created_at')


class LandlordRefundListView(generics.ListAPIView):
    """Landlord: Get all refunds across all tenants and properties"""
    serializer_class = RefundDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            landlord_id = self.request.auth.payload.get('landlord_id')
        except AttributeError:
            landlord_id = None

        if landlord_id:
            properties = Property.objects.filter(landlord_id=landlord_id)
        else:
            properties = Property.objects.filter(owner=user)

        return Refund.objects.filter(
            booking__property__in=properties
        ).order_by('-requested_at')


# ----------------------
# BOOKING - DETAIL
# ----------------------
class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/delete a booking"""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Only allow users to see their own bookings"""
        user = self.request.user
        # Check if user is the one who made the booking
        return Booking.objects.filter(user=user)

    def perform_update(self, serializer):
        """Only allow cancellation by user"""
        booking = self.get_object()
        request_user = self.request.user
        
        if booking.user != request_user:
            raise ValidationError({"error": "You can only modify your own bookings"})
        
        serializer.save()

    def perform_destroy(self, instance):
        """Allow users to cancel their bookings"""
        user = self.request.user
        if instance.user != user:
            raise ValidationError({"error": "You can only cancel your own bookings"})
        instance.status = 'cancelled'
        instance.save()


# ----------------------
# PAYMENT PROCESSING (ESEWA 2.0 - EPAY2)
# ----------------------
class InitiateEsewaPaymentView(views.APIView):
    """Initiate eSewa 2.0 payment for a booking"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Initiate eSewa payment
        Expected body: {
            "booking_id": 1
        }
        The success/failure URLs are auto-constructed from the request origin.
        """
        try:
            booking_id = request.data.get('booking_id')
            
            if not booking_id:
                return Response(
                    {'error': 'booking_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the booking
            booking = Booking.objects.get(id=booking_id, user=request.user)
            
            # Use request origin for callback URLs
            origin = request.META.get('HTTP_ORIGIN', 'http://localhost:5173')
            
            # Initiate payment with eSewa 2.0
            payment_data = create_esewa_payment_link(booking, origin)
            
            return Response({
                'success': True,
                'message': 'Payment initiated successfully',
                'payment_data': payment_data,
                'esewa_url': 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
                'environment': getattr(settings, 'ESEWA_ENVIRONMENT', 'sandbox'),
            }, status=status.HTTP_200_OK)
            
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEsewaPaymentView(views.APIView):
    """Verify eSewa 2.0 payment response with SHA256 signature verification"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        """
        Verify eSewa payment response
        Expected body: {
            "oid": "transaction_id_from_esewa",
            "refId": "reference_id",
            "amount": "amount_in_paisa",
            "scd": "merchant_code",
            "signature": "base64_encoded_signature"
        }
        """
        try:
            # Extract eSewa response data
            response_data = {
                'oid': request.data.get('oid'),
                'refId': request.data.get('refId'),
                'amount': request.data.get('amount'),
                'scd': request.data.get('scd'),
                'signature': request.data.get('signature'),
            }
            
            # Validate required fields
            required_fields = ['oid', 'refId', 'amount', 'scd', 'signature']
            if not all(response_data.get(field) for field in required_fields):
                return Response(
                    {'error': 'Missing required payment fields'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify payment with eSewa service
            esewa_service = EsewaPaymentService()
            is_valid, message, transaction_data = esewa_service.verify_payment(response_data)
            
            if not is_valid:
                return Response(
                    {
                        'success': False,
                        'error': message,
                        'message': 'Payment verification failed',
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract booking ID from refId (format: booking_{id}_{timestamp})
            try:
                booking_id = int(response_data['refId'].split('_')[1])
            except (IndexError, ValueError):
                return Response(
                    {'error': 'Invalid reference ID format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get and update booking
            booking = Booking.objects.get(id=booking_id, user=request.user)
            
            # Update booking with payment details — stays pending until agreement is signed
            booking.esewa_transaction_id = response_data.get('oid')
            booking.esewa_ref_id = response_data.get('refId')
            booking.payment_status = 'completed'
            booking.payment_method = 'esewa'
            booking.save()

            # Create or update Payment record
            payment, _ = Payment.objects.get_or_create(
                booking=booking,
                defaults={
                    'tenant': request.user,
                    'amount': booking.total_price,
                    'status': 'completed',
                    'payment_method': 'esewa',
                    'transaction_id': response_data.get('oid'),
                }
            )

            # Auto-generate Rental Agreement
            try:
                from .agreement_views import generate_agreement_content
                property_obj = booking.property
                landlord_user = property_obj.owner
                tenant_user = request.user

                # Get profile info for snapshots
                tenant_profile = getattr(tenant_user, 'profile', None)
                landlord_profile = getattr(landlord_user, 'profile', None)
                tenant_kyc = KYC.objects.filter(user=tenant_user).first()
                landlord_kyc = KYC.objects.filter(user=landlord_user).first()

                # Calculate lease duration
                duration_days = (booking.check_out - booking.check_in).days
                duration_months = max(1, round(duration_days / 30))

                # Generate agreement content
                agreement_content = generate_agreement_content(
                    booking, property_obj, tenant_user, landlord_user, payment
                )

                agreement = RentalAgreement.objects.create(
                    booking=booking,
                    property=property_obj,
                    tenant=tenant_user,
                    landlord=landlord_user,
                    status='pending_tenant',
                    agreement_content=agreement_content,
                    monthly_rent=property_obj.price,
                    security_deposit=property_obj.security_deposit or 0,
                    lease_duration_months=duration_months,
                    tenant_name=f"{tenant_user.first_name} {tenant_user.last_name}".strip() or tenant_user.username,
                    tenant_email=tenant_user.email,
                    tenant_phone=tenant_profile.phone if tenant_profile else '',
                    tenant_citizenship=tenant_kyc.citizenship_number if tenant_kyc else '',
                    landlord_name=f"{landlord_user.first_name} {landlord_user.last_name}".strip() or landlord_user.username,
                    landlord_email=landlord_user.email,
                    landlord_phone=landlord_profile.phone if landlord_profile else '',
                    landlord_kyc_verified=landlord_kyc.status == 'approved' if landlord_kyc else False,
                    property_name=property_obj.title,
                    property_address=f"{property_obj.address}, {property_obj.city}",
                    property_type=dict(Property.PROPERTY_TYPES).get(property_obj.property_type, property_obj.property_type),
                    transaction_id=payment.transaction_id or response_data.get('oid', ''),
                    payment_date=payment.payment_date if payment else timezone.now(),
                    amount_paid=payment.amount or booking.total_price,
                )

                # Notify tenant
                Notification.objects.create(
                    recipient=tenant_user,
                    notification_type='agreement_created',
                    title='Rental Agreement Ready',
                    message=f"Your rental agreement for {property_obj.title} has been generated. Please review and sign.",
                    related_entity_type='agreement',
                    related_entity_id=agreement.id,
                )
            except Exception as e:
                print(f"Agreement generation error (non-fatal): {e}")
            
            return Response({
                'success': True,
                'message': 'Payment verified successfully',
                'booking_id': booking.id,
                'transaction_id': response_data.get('oid'),
                'payment_status': 'completed',
                'booking_status': 'confirmed',
            }, status=status.HTTP_200_OK)
            
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Payment verification error: {str(e)}")
            return Response(
                {'error': f'Verification error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Keep ProcessPaymentView as alias for backwards compatibility
class ProcessPaymentView(VerifyEsewaPaymentView):
    """Legacy endpoint - use VerifyEsewaPaymentView instead"""
    pass


# =====================================================
# ADMIN - BOOKING MANAGEMENT
# =====================================================

# ----------------------
# ADMIN - BOOKING LIST
# ----------------------
class AdminBookingListView(generics.ListAPIView):
    """Admin: Get all bookings with full details"""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Only admins can access this"""
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Booking.objects.none()
        return Booking.objects.select_related('user', 'property').order_by('-created_at')


# ----------------------
# ADMIN - BOOKING UPDATE STATUS
# ----------------------
class AdminBookingUpdateStatusView(generics.UpdateAPIView):
    """Admin: Update booking status"""
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    lookup_field = 'id'

    def get_queryset(self):
        """Only admins can access"""
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Booking.objects.none()
        return Booking.objects.all()

    def perform_update(self, serializer):
        """Update booking status"""
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            raise ValidationError({"error": "Only admins can update booking status"})
        
        booking = self.get_object()
        new_status = self.request.data.get('status')
        
        valid_statuses = ['pending', 'processing', 'confirmed', 'completed', 'cancelled']
        if new_status not in valid_statuses:
            raise ValidationError({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"})
        
        Booking.objects.filter(id=booking.id).update(status=new_status)


# ----------------------
# USER - BOOKING CANCEL
# ----------------------
class BookingCancelView(APIView):
    """
    User: Cancel their own booking
    
    POST /api/bookings/<booking_id>/cancel/
    
    Returns:
    - booking_id: The cancelled booking ID
    - status: New booking status ("cancelled")
    - refund_amount: Amount being refunded to the tenant
    - refund_percentage: Percentage of original amount being refunded
    - policy_applied: Description of the policy applied
    - message: Success message
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, id):
        """Cancel a booking and process refund"""
        from django.utils import timezone
        from decimal import Decimal
        
        user = request.user
        
        # Get the booking
        try:
            booking = Booking.objects.get(id=id, user=user)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found or you don't have permission to cancel it"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Only allow cancellation of confirmed bookings
        if booking.status != 'confirmed':
            return Response(
                {
                    "error": f"Cannot cancel a booking with status '{booking.status}'",
                    "current_status": booking.status
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already cancelled
        if hasattr(booking, 'cancellation') and booking.cancellation:
            return Response(
                {"error": "This booking has already been cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"\n📍 [CANCEL BOOKING] User {user.username} initiating cancellation for booking {booking.id}")
        
        try:
            # Get the cancellation policy
            policy = CancellationPolicy.get_default_policy()
            
            # Calculate refund amount
            refund_info = policy.calculate_refund_amount(booking)
            refund_amount = Decimal(str(refund_info['refund_amount']))
            
            # Get the original payment
            payment = booking.payments.filter(status='completed').first()
            
            if not payment:
                # Create a payment record if it doesn't exist (for bookings that were paid)
                payment = Payment.objects.create(
                    booking=booking,
                    tenant=user,
                    amount=booking.total_price,
                    status='completed',
                    payment_method=booking.payment_method,
                    transaction_id=booking.esewa_transaction_id
                )
            
            # Update booking status
            booking.status = 'cancelled'
            booking.cancelled_at = timezone.now()
            booking.save()
            
            # Make property available again
            property_obj = booking.property
            property_obj.available = True
            property_obj.save()
            
            # Create cancellation record
            cancellation = Cancellation.objects.create(
                booking=booking,
                cancelled_by=user,
                reason=request.data.get('reason', 'User requested cancellation')
            )
            
            # Create refund record
            refund = Refund.objects.create(
                payment=payment,
                booking=booking,
                refund_amount=refund_amount,
                refund_percentage=refund_info['refund_percentage'],
                status='pending',  # In a real system, this would be 'processed' after payment gateway processing
                reason='Booking cancellation',
                policy_applied=refund_info['policy_applied']
            )
            
            # Mark payment as refunded if full refund
            if refund_info['refund_percentage'] == 100:
                payment.status = 'refunded'
                payment.save()
            
            # Send notifications to tenant and landlord
            self._send_cancellation_notifications(booking, refund_info, user)
            
            print(f"✅ [CANCEL BOOKING] Booking {booking.id} cancelled successfully")
            print(f"   Refund Amount: {refund_amount} ({refund_info['refund_percentage']}%)")
            print(f"   Policy: {refund_info['policy_applied']}")
            
            # Return response
            return Response({
                'booking_id': booking.id,
                'status': booking.status,
                'refund_amount': str(refund_amount),
                'refund_percentage': refund_info['refund_percentage'],
                'policy_applied': refund_info['policy_applied'],
                'message': f"Booking cancelled successfully. You will receive NPR {refund_amount} refund."
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            print(f"❌ [CANCEL BOOKING] Error cancelling booking {booking.id}: {str(e)}")
            return Response(
                {"error": f"Failed to cancel booking: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_cancellation_notifications(self, booking, refund_info, tenant_user):
        """Send notifications to tenant and landlord about cancellation"""
        from django.utils import timezone
        
        try:
            # Get the property owner (landlord)
            property_obj = booking.property
            landlord_user = property_obj.owner
            
            # Notify tenant
            Notification.objects.create(
                recipient=tenant_user,
                notification_type='booking_cancelled',
                title='Booking Cancelled',
                message=f"Your booking for {property_obj.title} has been cancelled. "
                        f"Refund amount: NPR {refund_info['refund_amount']} "
                        f"({refund_info['refund_percentage']}% of total amount).",
                related_entity_type='booking',
                related_entity_id=booking.id
            )
            
            # Notify landlord
            Notification.objects.create(
                recipient=landlord_user,
                notification_type='booking_cancelled',
                title='Booking Cancelled',
                message=f"The booking for {property_obj.title} by {tenant_user.username} "
                        f"(check-in: {booking.check_in}) has been cancelled by the tenant.",
                related_entity_type='booking',
                related_entity_id=booking.id
            )
            
            # Send email to tenant
            send_mail(
                'Booking Cancelled - Refund Initiated',
                f"""
Hello {tenant_user.first_name or tenant_user.username},

Your booking for {property_obj.title} has been cancelled.

Booking Details:
- Property: {property_obj.title}
- Check-in: {booking.check_in}
- Check-out: {booking.check_out}
- Original Amount: NPR {booking.total_price}
- Refund Amount: NPR {refund_info['refund_amount']}
- Refund Percentage: {refund_info['refund_percentage']}%
- Policy: {refund_info['policy_applied']}

Your refund will be processed within 5-7 business days.

Thank you for using StayEasy!

Best regards,
StayEasy Team
                """,
                'noreply@stayeasy.com',
                [tenant_user.email],
                fail_silently=True
            )
            
            # Send email to landlord
            send_mail(
                'Booking Cancelled - Tenant Cancellation',
                f"""
Hello {landlord_user.first_name or landlord_user.username},

A booking for your property has been cancelled.

Booking Details:
- Property: {property_obj.title}
- Tenant: {tenant_user.first_name or tenant_user.username}
- Check-in: {booking.check_in}
- Check-out: {booking.check_out}
- Original Amount: NPR {booking.total_price}
- Tenant Refund: NPR {refund_info['refund_amount']}
- Policy: {refund_info['policy_applied']}

Best regards,
StayEasy Team
                """,
                'noreply@stayeasy.com',
                [landlord_user.email],
                fail_silently=True
            )
            
            print(f"✅ [NOTIFICATIONS] Sent to tenant and landlord for booking {booking.id}")
        
        except Exception as e:
            print(f"⚠️ [NOTIFICATIONS] Failed to send notifications: {str(e)}")
            # Don't fail the cancellation if notifications fail



# =====================================================
# ADMIN - USER MANAGEMENT
# =====================================================

# ----------------------
# ADMIN - USERS LIST (Tenants)
# ----------------------
class AdminUserListView(generics.ListAPIView):
    """Admin: Get all users (tenants only)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Only admins can access"""
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return User.objects.none()
        
        # Get users with user_type='tenant' (exclude admins)
        return User.objects.filter(
            profile__user_type='tenant'
        ).exclude(
            profile__role='admin'
        ).select_related('profile').order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        """Return formatted user data"""
        user = request.user
        
        # Check if user is authenticated
        if not user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is admin (superuser or has admin role)
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.get_queryset()
        users_data = []
        
        for u in queryset:
            users_data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'user_type': u.profile.user_type,
                'role': u.profile.role,
                'email_verified': u.profile.email_verified,
                'date_joined': u.date_joined,
                'bookings_count': u.bookings.count(),
            })
        
        return Response({
            'count': len(users_data),
            'results': users_data
        })


# ----------------------
# ADMIN - LANDLORDS LIST
# ----------------------
class AdminLandlordListView(generics.ListAPIView):
    """Admin: Get all landlords"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Only admins can access"""
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return User.objects.none()
        
        # Get users with user_type='owner' (landlords) but exclude admins
        return User.objects.filter(
            profile__user_type='owner'
        ).exclude(
            profile__role='admin'
        ).select_related('profile').order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        """Return formatted landlord data"""
        user = request.user
        
        # Check if user is authenticated
        if not user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is admin (superuser or has admin role)
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.get_queryset()
        landlords_data = []
        
        for u in queryset:
            kyc = KYC.objects.filter(user=u).first()
            kyc_status = kyc.status if kyc else 'not_submitted'
            landlords_data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'user_type': u.profile.user_type,
                'role': u.profile.role,
                'email_verified': u.profile.email_verified,
                'kyc_status': kyc_status,
                'date_joined': u.date_joined,
                'properties_count': u.properties.count(),
                'total_bookings': Booking.objects.filter(
                    property__owner=u
                ).count(),
            })
        
        return Response({
            'count': len(landlords_data),
            'results': landlords_data
        })


# ----------------------
# ADMIN - USER DETAIL
# ----------------------
class AdminUserDetailView(views.APIView):
    """Admin: Get full details of a user (tenant or landlord)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request, id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = Profile.objects.get_or_create(user=user)
        user_type = profile.user_type or 'tenant'
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'user_type': user_type,
            'role': profile.role,
            'email_verified': profile.email_verified,
            'date_joined': user.date_joined,
            'is_active': user.is_active,
        }

        # KYC info (relevant for landlords)
        kyc = KYC.objects.filter(user=user).first()
        if kyc:
            data['kyc'] = {
                'id': kyc.id,
                'full_name': kyc.full_name,
                'phone_number': kyc.phone_number,
                'citizenship_number': kyc.citizenship_number,
                'document_image': f"/uploads/{kyc.document_image.name}" if kyc.document_image else None,
                'status': kyc.status,
                'submitted_at': kyc.submitted_at,
                'verified_by': {
                    'id': kyc.verified_by.id,
                    'name': f"{kyc.verified_by.first_name} {kyc.verified_by.last_name}",
                    'email': kyc.verified_by.email,
                } if kyc.verified_by else None,
                'verified_at': kyc.verified_at,
            }
        else:
            data['kyc'] = None

        # Bookings for tenants
        if user_type == 'tenant':
            bookings = Booking.objects.filter(user=user).order_by('-created_at')
            data['bookings_count'] = bookings.count()
            data['bookings'] = [{
                'id': b.id,
                'property_title': b.property.title,
                'property_id': b.property.id,
                'check_in': b.check_in,
                'check_out': b.check_out,
                'total_price': str(b.total_price),
                'status': b.status,
                'payment_status': b.payment_status,
                'created_at': b.created_at,
            } for b in bookings]
            # Current rented property (active booking with confirmed/processing status)
            current = bookings.filter(status__in=['confirmed', 'processing']).first()
            data['current_rental'] = {
                'id': current.id,
                'property_title': current.property.title,
                'property_id': current.property.id,
                'check_in': current.check_in,
                'check_out': current.check_out,
                'status': current.status,
            } if current else None
        else:
            data['bookings_count'] = Booking.objects.filter(property__owner=user).count()
            data['properties_count'] = user.properties.count()
            data['bookings'] = None
            data['current_rental'] = None

        # Moderation info
        warnings_qs = Warning.objects.filter(user=user)
        suspensions_qs = Suspension.objects.filter(user=user)
        data['moderation'] = {
            'warnings_count': warnings_qs.count(),
            'active_warnings_count': warnings_qs.filter(is_read=False).count(),
            'suspensions_count': suspensions_qs.count(),
            'active_suspension': SuspensionSerializer(
                suspensions_qs.filter(is_active=True).first()
            ).data if suspensions_qs.filter(is_active=True).exists() else None,
            'recent_warnings': WarningSerializer(warnings_qs[:5], many=True).data,
            'recent_actions': ModerationActionSerializer(
                ModerationAction.objects.filter(user=user)[:10], many=True
            ).data,
        }

        return Response(data)


# ----------------------
# FAVORITE - USER LIST
# ----------------------
class UserFavoriteListView(generics.ListAPIView):
    """User: Get their favorite properties"""
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get only favorites for the current user"""
        return Favorite.objects.filter(user=self.request.user).order_by('-created_at')


# ----------------------
# FAVORITE - CREATE/DELETE
# ----------------------
class FavoriteToggleView(APIView):
    """User: Add or remove a property from favorites"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Add to favorites"""
        serializer = FavoriteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        property_id = serializer.validated_data['property'].id
        user = request.user
        
        # Check if already favorited
        favorite = Favorite.objects.filter(user=user, property_id=property_id).first()
        if favorite:
            return Response(
                {"message": "Already in favorites"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        Favorite.objects.create(user=user, property_id=property_id)
        return Response(
            {"message": "Added to favorites"},
            status=status.HTTP_201_CREATED
        )

    def delete(self, request):
        """Remove from favorites"""
        property_id = request.data.get('property_id')
        if not property_id:
            return Response(
                {"error": "property_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        favorite = Favorite.objects.filter(
            user=request.user,
            property_id=property_id
        ).first()
        
        if not favorite:
            return Response(
                {"error": "Not in favorites"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        favorite.delete()
        return Response(
            {"message": "Removed from favorites"},
            status=status.HTTP_200_OK
        )


# ----------------------
# VIEWED PROPERTY - USER LIST
# ----------------------
class ViewedPropertyListView(generics.ListAPIView):
    """User: Get their viewed properties"""
    serializer_class = ViewedPropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get only viewed properties for the current user"""
        return ViewedProperty.objects.filter(user=self.request.user).order_by('-last_viewed')


# ----------------------
# VIEWED PROPERTY - TRACK VIEW
# ----------------------
class ViewPropertyView(APIView):
    """User: Record that they viewed a property"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Track property view"""
        property_id = request.data.get('property_id')
        if not property_id:
            return Response(
                {"error": "property_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {"error": "Property not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        user = request.user
        viewed, created = ViewedProperty.objects.get_or_create(
            user=user,
            property=property_obj
        )
        
        if not created:
            # Increment view count
            viewed.view_count += 1
            viewed.save()
        
        serializer = ViewedPropertySerializer(viewed)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# =====================================================
# ADMIN - MODERATION MANAGEMENT
# =====================================================

# ----------------------
# ADMIN - WARN USER
# ----------------------
class AdminWarnUserView(APIView):
    """Admin: Issue a warning to a user"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, user_id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = WarningCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        warning = Warning.objects.create(
            user=target_user,
            issued_by=request.user,
            reason=serializer.validated_data['reason'],
            custom_reason=serializer.validated_data.get('custom_reason', ''),
            message=serializer.validated_data['message'],
        )

        # Create notification for the user
        Notification.objects.create(
            recipient=target_user,
            notification_type='admin_action',
            title='Warning Issued',
            message=f"You have received a warning: {warning.get_reason_display()}. {warning.message}",
            related_entity_type='warning',
            related_entity_id=warning.id,
        )

        # Log moderation action
        ModerationAction.objects.create(
            user=target_user,
            admin=request.user,
            action_type='warning',
            reason=warning.get_reason_display(),
            details={
                'warning_id': warning.id,
                'message': warning.message,
                'custom_reason': warning.custom_reason,
            }
        )

        return Response(WarningSerializer(warning).data, status=status.HTTP_201_CREATED)


# ----------------------
# ADMIN - SUSPEND USER
# ----------------------
class AdminSuspendUserView(APIView):
    """Admin: Suspend a user account"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, user_id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SuspensionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data['reason']
        duration = serializer.validated_data['duration']

        # Calculate expiry
        expires_at = None
        if duration != 'permanent':
            from datetime import timedelta
            duration_map = {
                '24h': timedelta(hours=24),
                '3d': timedelta(days=3),
                '7d': timedelta(days=7),
                '30d': timedelta(days=30),
            }
            expires_at = timezone.now() + duration_map[duration]

        # Deactivate all active suspensions for this user
        Suspension.objects.filter(user=target_user, is_active=True).update(is_active=False)

        suspension = Suspension.objects.create(
            user=target_user,
            issued_by=request.user,
            reason=reason,
            duration=duration,
            expires_at=expires_at,
            is_active=True,
        )

        # Create notification for the user
        expiry_text = "Permanent" if duration == 'permanent' else f"Expires: {expires_at.strftime('%Y-%m-%d %H:%M')}"
        Notification.objects.create(
            recipient=target_user,
            notification_type='admin_action',
            title='Account Suspended',
            message=f"Your account has been suspended. Reason: {reason}. Duration: {suspension.get_duration_display()}. {expiry_text}",
            related_entity_type='suspension',
            related_entity_id=suspension.id,
        )

        # Log moderation action
        ModerationAction.objects.create(
            user=target_user,
            admin=request.user,
            action_type='suspension',
            reason=reason,
            details={
                'suspension_id': suspension.id,
                'duration': duration,
                'expires_at': expires_at.isoformat() if expires_at else None,
            }
        )

        return Response(SuspensionSerializer(suspension).data, status=status.HTTP_201_CREATED)


# ----------------------
# ADMIN - LIFT SUSPENSION
# ----------------------
class AdminLiftSuspensionView(APIView):
    """Admin: Lift an active suspension"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, suspension_id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            suspension = Suspension.objects.get(pk=suspension_id, is_active=True)
        except Suspension.DoesNotExist:
            return Response({"error": "Active suspension not found"}, status=status.HTTP_404_NOT_FOUND)

        suspension.is_active = False
        suspension.lifted_at = timezone.now()
        suspension.lifted_by = request.user
        suspension.save()

        # Notify user
        Notification.objects.create(
            recipient=suspension.user,
            notification_type='admin_action',
            title='Suspension Lifted',
            message="Your account suspension has been lifted by an admin.",
            related_entity_type='suspension',
            related_entity_id=suspension.id,
        )

        # Log moderation action
        ModerationAction.objects.create(
            user=suspension.user,
            admin=request.user,
            action_type='lift_suspension',
            reason="Lifted by admin",
            details={'suspension_id': suspension.id}
        )

        return Response(SuspensionSerializer(suspension).data)


# ----------------------
# ADMIN - ADD NOTE
# ----------------------
class AdminAddNoteView(APIView):
    """Admin: Add a moderation note to a user"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, user_id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        note = request.data.get('note', '')
        if not note:
            return Response({"error": "Note is required"}, status=status.HTTP_400_BAD_REQUEST)

        ModerationAction.objects.create(
            user=target_user,
            admin=request.user,
            action_type='note',
            reason=note,
            details={'note': note}
        )

        return Response({"message": "Note added successfully"}, status=status.HTTP_201_CREATED)


# ----------------------
# ADMIN - MODERATION HISTORY
# ----------------------
class AdminModerationHistoryView(APIView):
    """Admin: Get moderation history for a user"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request, user_id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        warnings = Warning.objects.filter(user=target_user)
        suspensions = Suspension.objects.filter(user=target_user)
        actions = ModerationAction.objects.filter(user=target_user)

        return Response({
            'warnings': WarningSerializer(warnings, many=True).data,
            'warnings_count': warnings.count(),
            'active_warnings_count': warnings.filter(is_read=False).count(),
            'suspensions': SuspensionSerializer(suspensions, many=True).data,
            'suspensions_count': suspensions.count(),
            'active_suspension': SuspensionSerializer(
                suspensions.filter(is_active=True).first()
            ).data if suspensions.filter(is_active=True).exists() else None,
            'moderation_actions': ModerationActionSerializer(actions, many=True).data,
            'moderation_actions_count': actions.count(),
        })


# ----------------------
# USER - CHECK SUSPENSION STATUS
# ----------------------
class CheckSuspensionStatusView(APIView):
    """User: Check if the current user is suspended"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        active_suspension = Suspension.objects.filter(user=user, is_active=True).first()

        if not active_suspension:
            return Response({
                'is_suspended': False,
                'suspension': None,
            })

        # Check if expired
        if active_suspension.expires_at and active_suspension.expires_at < timezone.now():
            active_suspension.is_active = False
            active_suspension.save()
            return Response({
                'is_suspended': False,
                'suspension': None,
            })

        return Response({
            'is_suspended': True,
            'suspension': SuspensionSerializer(active_suspension).data,
        })


# ----------------------
# USER - GET MY WARNINGS
# ----------------------
class UserWarningListView(APIView):
    """User: Get all warnings issued to the current user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        warnings = Warning.objects.filter(user=request.user)
        return Response({
            'count': warnings.count(),
            'results': WarningSerializer(warnings, many=True).data,
        })


# ----------------------
# USER - MARK WARNING AS READ
# ----------------------
class MarkWarningReadView(APIView):
    """User: Mark a warning as read"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, warning_id):
        try:
            warning = Warning.objects.get(pk=warning_id, user=request.user)
        except Warning.DoesNotExist:
            return Response({"error": "Warning not found"}, status=status.HTTP_404_NOT_FOUND)

        warning.is_read = True
        warning.save()
        return Response(WarningSerializer(warning).data)


# ----------------------
# ADMIN - PROPERTY HIDE/UNHIDE
# ----------------------
class AdminPropertyToggleVisibilityView(APIView):
    """Admin: Hide or unhide a property listing"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, property_id):
        is_admin = request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'role', None) == 'admin'
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            property_obj = Property.objects.get(pk=property_id)
        except Property.DoesNotExist:
            return Response({"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

        hide = request.data.get('hide', True)
        property_obj.available = not hide
        property_obj.save()

        action_type = 'property_hide' if hide else 'property_unhide'

        ModerationAction.objects.create(
            user=property_obj.owner,
            admin=request.user,
            action_type=action_type,
            reason=request.data.get('reason', ''),
            details={
                'property_id': property_obj.id,
                'property_title': property_obj.title,
                'hide': hide,
            }
        )

        # Notify the owner
        verb = "hidden" if hide else "unhidden"
        Notification.objects.create(
            recipient=property_obj.owner,
            notification_type='admin_action',
            title=f'Property {verb.capitalize()}',
            message=f'Your property "{property_obj.title}" has been {verb} by an admin.',
            related_entity_type='property',
            related_entity_id=property_obj.id,
        )

        return Response({
            'message': f'Property {"hidden" if hide else "unhidden"} successfully',
            'property_id': property_obj.id,
            'available': property_obj.available,
        })


# =====================================================
# FORGOT / RESET PASSWORD
# =====================================================

class ForgotPasswordView(views.APIView):
    """Send password reset link to user's email"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        profile, _ = Profile.objects.get_or_create(user=user)

        token = secrets.token_urlsafe(32)
        profile.set_reset_token(token, minutes=60)

        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"

        from django.template.loader import render_to_string
        from django.utils.html import strip_tags

        html_message = render_to_string('emails/reset_password.html', {
            'user': user,
            'reset_url': reset_url,
        })
        plain_message = strip_tags(html_message)

        send_mail(
            "Reset your StayEasy password",
            plain_message,
            None,
            [email],
            fail_silently=False,
            html_message=html_message,
        )

        return Response({
            'message': 'If an account with that email exists, a password reset link has been sent.',
        }, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    """Reset password using token"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        password = serializer.validated_data['password']

        try:
            profile = Profile.objects.get(password_reset_token=token)
        except Profile.DoesNotExist:
            return Response({'error': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        if not profile.password_reset_expires or timezone.now() > profile.password_reset_expires:
            profile.clear_reset_token()
            return Response({'error': 'Reset token has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        user = profile.user
        user.set_password(password)
        user.save()

        profile.clear_reset_token()

        return Response({
            'message': 'Password has been reset successfully.',
        }, status=status.HTTP_200_OK)


# =====================================================
# RECENT ACTIVITY FEED
# =====================================================

class RecentActivityView(views.APIView):
    """Unified activity feed combining bookings, payments, favorites, and notifications"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        activities = []

        # Recent bookings
        for b in Booking.objects.filter(user=user).order_by('-created_at')[:10]:
            activities.append({
                'type': 'booking',
                'action': b.status,
                'title': f"Booking {dict(Booking.STATUS_CHOICES).get(b.status, b.status)}",
                'description': f"{b.property.title} — NPR {b.total_price}",
                'timestamp': b.created_at.isoformat(),
                'icon': 'CalendarCheck',
                'color': 'blue' if b.status == 'pending' else 'green' if b.status in ('confirmed', 'completed') else 'red',
                'entity_type': 'booking',
                'entity_id': b.id,
            })

        # Recent payments (as tenant)
        for p in Payment.objects.filter(tenant=user).order_by('-payment_date')[:10]:
            activities.append({
                'type': 'payment',
                'action': p.status,
                'title': f"Payment {dict(Payment.PAYMENT_STATUS).get(p.status, p.status)}",
                'description': f"Booking #{p.booking.id} — NPR {p.amount}",
                'timestamp': p.payment_date.isoformat(),
                'icon': 'CreditCard',
                'color': 'green' if p.status == 'completed' else 'red' if p.status == 'failed' else 'orange',
                'entity_type': 'payment',
                'entity_id': p.id,
            })

        # Recent bookings where user is landlord (property owner)
        for b in Booking.objects.filter(property__owner=user).order_by('-created_at')[:10]:
            activities.append({
                'type': 'booking_request',
                'action': b.status,
                'title': f"{'New' if b.status == 'pending' else b.status.title()} Booking Request",
                'description': f"{(b.user.get_full_name() or b.user.username)} — {b.property.title}",
                'timestamp': b.created_at.isoformat(),
                'icon': 'CalendarCheck',
                'color': 'blue' if b.status == 'pending' else 'green' if b.status in ('confirmed', 'completed') else 'red',
                'entity_type': 'booking',
                'entity_id': b.id,
            })

        # Recent favorites
        for f in Favorite.objects.filter(user=user).order_by('-created_at')[:10]:
            activities.append({
                'type': 'favorite',
                'action': 'saved',
                'title': 'Property Saved',
                'description': f.title,
                'timestamp': f.created_at.isoformat(),
                'icon': 'Heart',
                'color': 'orange',
                'entity_type': 'property',
                'entity_id': f.property.id,
            })

        # Sort by timestamp descending
        activities.sort(key=lambda a: a['timestamp'], reverse=True)

        # Limit to 20
        activities = activities[:20]

        return Response(activities, status=status.HTTP_200_OK)


# =====================================================
# PAYMENT FAILURE INQUIRY
# =====================================================

class CreatePaymentFailureInquiryView(APIView):
    """Create a payment failure inquiry when payment fails"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({"error": "booking_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        inquiry, created = PaymentFailureInquiry.objects.get_or_create(
            tenant=request.user,
            landlord=booking.property.owner,
            property=booking.property,
            booking=booking,
            defaults={'status': 'open'},
        )

        Notification.objects.create(
            recipient=booking.property.owner,
            notification_type='payment_inquiry',
            title='Payment Failed - Booking Inquiry',
            message=f"{request.user.get_full_name() or request.user.username} attempted to book {booking.property.title} but payment was unsuccessful. They would like to discuss payment arrangements.",
            related_entity_type='booking',
            related_entity_id=booking.id,
        )

        return Response({
            'id': inquiry.id,
            'status': inquiry.status,
            'message': 'Payment failure inquiry created',
        }, status=status.HTTP_201_CREATED)