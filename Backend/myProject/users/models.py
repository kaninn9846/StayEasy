from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


# ============================================================
# LANDLORD USER MODEL
# Separate authentication system for property owners
# ============================================================
class LandlordUser(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    
    # Business info
    business_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.email})"


# ============================================================
# PROFILE MODEL
# Stores extra user info (role, email verification, reset token)
# ============================================================
class Profile(models.Model):

    USER_TYPES = (
        ('tenant', 'Tenant/User'),
        ('owner', 'Owner/Landlord'),
    )

    ROLES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    user_type = models.CharField(max_length=10, choices=USER_TYPES, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLES, default='user')
    email_verified = models.BooleanField(default=False)

    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)

    password_reset_token = models.CharField(max_length=255, blank=True, null=True)
    password_reset_expires = models.DateTimeField(blank=True, null=True)

    email_verification_code = models.CharField(max_length=6, blank=True, null=True)
    email_verification_expires = models.DateTimeField(blank=True, null=True)

    def set_verification_code(self, code, minutes=10):
        self.email_verification_code = code
        self.email_verification_expires = timezone.now() + timedelta(minutes=minutes)
        self.save()

    def clear_verification_code(self):
        self.email_verification_code = None
        self.email_verification_expires = None
        self.save()

    def set_reset_token(self, token, minutes=60):
        self.password_reset_token = token
        self.password_reset_expires = timezone.now() + timedelta(minutes=minutes)
        self.save()

    def clear_reset_token(self):
        self.password_reset_token = None
        self.password_reset_expires = None
        self.save()

    def __str__(self):
        return f"{self.user.username} ({self.role})"


# ============================================================
# KYC MODEL
# User identity verification
# ============================================================
class KYC(models.Model):

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    # linked user
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="kyc")

    # user submitted information
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    citizenship_number = models.CharField(max_length=100)

    # uploaded documents
    document_image = models.ImageField(upload_to='kyc_documents/', max_length=255)
    document_back_image = models.ImageField(upload_to='kyc_documents/', null=True, blank=True, max_length=255)
    selfie_image = models.ImageField(upload_to='kyc_selfies/', null=True, blank=True, max_length=255)

    # verification status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # submission time
    submitted_at = models.DateTimeField(auto_now_add=True)

    # admin verification info
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_kyc"
    )

    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.status}"


# ============================================================
# PROPERTY MODEL
# Property listed by landlords
# ============================================================
class Property(models.Model):

    PROPERTY_TYPES = (
        ('room', 'Room'),
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('land', 'Land'),
    )

    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('booked', 'Booked'),
        ('archived', 'Archived'),
    )

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="properties")
    landlord = models.ForeignKey(LandlordUser, on_delete=models.CASCADE, related_name="properties", null=True, blank=True)

    title = models.CharField(max_length=255)
    description = models.TextField()

    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES)

    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True, default='')
    district = models.CharField(max_length=100, blank=True, default='')
    area = models.CharField(max_length=100, blank=True, default='')

    bedrooms = models.IntegerField(null=True, blank=True)
    bathrooms = models.IntegerField(null=True, blank=True)
    area_size = models.IntegerField(null=True, blank=True)
    floor_number = models.IntegerField(null=True, blank=True)
    total_floors = models.IntegerField(null=True, blank=True)
    furnishing = models.CharField(max_length=50, blank=True, default='')
    amenities = models.JSONField(default=list, blank=True)

    available_from = models.DateField(null=True, blank=True)
    lease_period = models.CharField(max_length=100, blank=True, default='')

    price = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    maintenance_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    available = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='published')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# ============================================================
# PROPERTY IMAGE MODEL
# Stores multiple images for properties
# ============================================================
class PropertyImage(models.Model):

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="images")

    image = models.ImageField(upload_to="property_images/")

    def __str__(self):
        return f"Image for {self.property.title}"


# ============================================================
# BOOKING MODEL
# Stores property bookings/reservations
# ============================================================
class Booking(models.Model):

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('esewa', 'eSewa'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    )

    PAYMENT_TYPE_CHOICES = (
        ('full', 'Full Payment'),
        ('partial', 'Partial Payment'),
    )

    # Linked user (tenant) and property
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="bookings")

    # Booking dates
    check_in = models.DateField()
    check_out = models.DateField()

    # Total price
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Booking Status (pending → processing → confirmed → completed)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Payment information
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='esewa')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='full')
    
    # eSewa 2.0 payment tracking
    esewa_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    esewa_ref_id = models.CharField(max_length=255, blank=True, null=True)
    esewa_signature = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)  # Track when booking was cancelled

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.property.title} ({self.status})"


# ============================================================
# FAVORITE MODEL
# Stores user's favorite/wishlist properties
# ============================================================
class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'property')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.property.title} (Favorite)"


# ============================================================
# VIEWED PROPERTY MODEL
# Tracks properties viewed by users
# ============================================================
class ViewedProperty(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="viewed_properties")
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="viewed_by")
    view_count = models.IntegerField(default=1)
    last_viewed = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'property')
        ordering = ['-last_viewed']

    def __str__(self):
        return f"{self.user.username} - {self.property.title} (Viewed {self.view_count} times)"


# ============================================================
# CHAT MODEL
# Stores conversations between users and landlords
# ============================================================
class Chat(models.Model):
    # User (tenant) and Landlord communication
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chats_as_user")
    landlord = models.ForeignKey(LandlordUser, on_delete=models.CASCADE, related_name="chats_as_landlord")
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="chats", null=True, blank=True)
    
    # Chat metadata
    subject = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'landlord', 'property')
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Chat: {self.user.username} ↔ {self.landlord.email} ({self.property.title if self.property else 'General'})"


# ============================================================
# MESSAGE MODEL
# Stores individual messages in chats
# ============================================================
class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages_sent_user", null=True, blank=True)
    sender_landlord = models.ForeignKey(LandlordUser, on_delete=models.CASCADE, related_name="messages_sent_landlord", null=True, blank=True)
    
    content = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    caption = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        sender = self.sender_user.username if self.sender_user else self.sender_landlord.email
        return f"Message in {self.chat.id}: {sender}"


# ============================================================
# CANCELLATION POLICY MODEL
# Defines refund policy rules based on cancellation timing
# ============================================================
class CancellationPolicy(models.Model):
    """
    Defines the cancellation and refund policy rules.
    A single policy rule applies to all bookings.
    """
    
    # Days before check-in for 100% refund
    full_refund_days = models.IntegerField(default=7, help_text="Days before check-in for 100% refund")
    
    # Days before check-in for 50% refund
    partial_refund_days = models.IntegerField(default=3, help_text="Days before check-in for 50% refund")
    
    # Percentage refunded for late cancellations (less than partial_refund_days)
    partial_refund_percentage = models.IntegerField(default=50, help_text="Percentage refunded for late cancellations")
    
    # Additional fee percentage that platform keeps
    platform_fee_percentage = models.IntegerField(default=0, help_text="Percentage fee platform keeps from cancelled bookings")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Cancellation Policies"
    
    def __str__(self):
        return f"Cancellation Policy (Updated: {self.updated_at.date()})"
    
    @staticmethod
    def get_default_policy():
        """Get or create the default cancellation policy"""
        policy, created = CancellationPolicy.objects.get_or_create(
            id=1,
            defaults={
                'full_refund_days': 7,
                'partial_refund_days': 3,
                'partial_refund_percentage': 50,
                'platform_fee_percentage': 0,
            }
        )
        return policy
    
    def calculate_refund_amount(self, booking):
        """
        Calculate refund amount based on cancellation policy and booking dates.
        
        Args:
            booking: Booking object
        
        Returns:
            dict with refund_amount, refund_percentage, policy_applied
        """
        from django.utils import timezone
        from datetime import timedelta
        
        booking_amount = float(booking.total_price)
        today = timezone.now().date()
        days_until_checkin = (booking.check_in - today).days
        
        if days_until_checkin >= self.full_refund_days:
            # Full refund
            return {
                'refund_amount': booking_amount,
                'refund_percentage': 100,
                'policy_applied': f'Full refund ({self.full_refund_days}+ days before check-in)'
            }
        elif days_until_checkin >= self.partial_refund_days:
            # Partial refund
            refund_amount = booking_amount * (self.partial_refund_percentage / 100)
            return {
                'refund_amount': round(refund_amount, 2),
                'refund_percentage': self.partial_refund_percentage,
                'policy_applied': f'{self.partial_refund_percentage}% refund ({self.partial_refund_days}-{self.full_refund_days - 1} days before check-in)'
            }
        else:
            # No refund
            return {
                'refund_amount': 0,
                'refund_percentage': 0,
                'policy_applied': f'No refund (Less than {self.partial_refund_days} days before check-in)'
            }


# ============================================================
# PAYMENT MODEL
# Records payment transactions for bookings
# ============================================================
class Payment(models.Model):
    """Records payment transactions"""
    
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="payments")
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    payment_method = models.CharField(max_length=50, default='esewa')
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    
    payment_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"Payment {self.id} - Booking {self.booking.id} ({self.status})"


# ============================================================
# REFUND MODEL
# Records refund transactions
# ============================================================
class Refund(models.Model):
    """Records refund transactions when bookings are cancelled"""
    
    REFUND_STATUS = (
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
    )
    
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="refund")
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="refund")
    
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2)
    refund_percentage = models.IntegerField(default=0, help_text="Percentage of original amount refunded")
    status = models.CharField(max_length=20, choices=REFUND_STATUS, default='pending')
    
    reason = models.CharField(max_length=255, blank=True, null=True)
    policy_applied = models.CharField(max_length=255, blank=True, null=True)
    
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Refund {self.id} - Booking {self.booking.id} ({self.status})"


# ============================================================
# CANCELLATION MODEL
# Records booking cancellation details
# ============================================================
class Cancellation(models.Model):
    """Records when a booking is cancelled"""
    
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="cancellation")
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancellations")
    
    reason = models.CharField(max_length=500, blank=True, null=True)
    
    cancelled_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-cancelled_at']
    
    def __str__(self):
        return f"Cancellation of Booking {self.booking.id}"


# ============================================================
# NOTIFICATION MODEL
# Sends notifications to users and landlords
# ============================================================
class Notification(models.Model):
    """Stores notifications for users and landlords"""
    
    NOTIFICATION_TYPES = (
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('booking_completed', 'Booking Completed'),
        ('refund_processed', 'Refund Processed'),
        ('kyc_approved', 'KYC Approved'),
        ('kyc_rejected', 'KYC Rejected'),
        ('payment_received', 'Payment Received'),
        ('payment_failed', 'Payment Failed'),
        ('admin_action', 'Admin Action'),
        ('agreement_created', 'Agreement Created'),
        ('agreement_tenant_signed', 'Agreement Signed by Tenant'),
        ('agreement_landlord_signed', 'Agreement Signed by Landlord'),
        ('agreement_activated', 'Agreement Activated'),
        ('agreement_expiring', 'Agreement Expiring Soon'),
        ('payment_inquiry', 'Payment Failure Inquiry'),
    )
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    related_entity_type = models.CharField(max_length=50, blank=True, null=True, help_text="e.g., 'booking', 'refund'")
    related_entity_id = models.IntegerField(blank=True, null=True)
    
    is_read = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Notification {self.id} - {self.title} (to {self.recipient.username})"


# ============================================================
# MODERATION MODELS
# Admin actions for user management (warnings, suspensions)
# ============================================================

class Warning(models.Model):
    """Records warnings issued to users by admins"""

    WARNING_REASONS = (
        ('fake_info', 'Fake Information'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('policy_violation', 'Policy Violation'),
        ('payment_issues', 'Payment Issues'),
        ('property_listing_issues', 'Property Listing Issues'),
        ('custom', 'Custom Reason'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="warnings")
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="warnings_issued")
    reason = models.CharField(max_length=50, choices=WARNING_REASONS)
    custom_reason = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Warning: {self.user.username} - {self.get_reason_display()}"


class Suspension(models.Model):
    """Records account suspensions"""

    DURATION_CHOICES = (
        ('24h', '24 Hours'),
        ('3d', '3 Days'),
        ('7d', '7 Days'),
        ('30d', '30 Days'),
        ('permanent', 'Permanent'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="suspensions")
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="suspensions_issued")
    reason = models.TextField()
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    lifted_at = models.DateTimeField(null=True, blank=True)
    lifted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="suspensions_lifted")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Suspension: {self.user.username} - {self.duration}"


class ModerationAction(models.Model):
    """Audit log for all moderation actions taken by admins"""

    ACTION_TYPES = (
        ('warning', 'Warning'),
        ('suspension', 'Suspension'),
        ('lift_suspension', 'Lift Suspension'),
        ('kyc_approve', 'KYC Approved'),
        ('kyc_reject', 'KYC Rejected'),
        ('kyc_resubmission', 'KYC Resubmission Requested'),
        ('property_hide', 'Property Hidden'),
        ('property_unhide', 'Property Unhidden'),
        ('note', 'Note Added'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="moderation_actions")
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="moderation_actions_taken")
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    reason = models.TextField(blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_action_type_display()} - {self.user.username} by {self.admin.username if self.admin else 'System'}"


# ============================================================
# RENTAL AGREEMENT MODEL
# Digital rental agreement with e-signature support
# ============================================================
class RentalAgreement(models.Model):
    """Digital rental agreement between tenant and landlord"""

    AGREEMENT_STATUSES = (
        ('draft', 'Draft'),
        ('pending_tenant', 'Pending Tenant Signature'),
        ('pending_landlord', 'Pending Landlord Signature'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('terminated', 'Terminated'),
    )

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='rental_agreements')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='rental_agreements')
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_agreements')
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='landlord_agreements')

    status = models.CharField(max_length=30, choices=AGREEMENT_STATUSES, default='pending_tenant')

    # Snapshot data — frozen at creation
    agreement_content = models.TextField(help_text="Full legal terms and conditions")
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2)
    lease_duration_months = models.IntegerField(default=12)

    # Snapshot of tenant info
    tenant_name = models.CharField(max_length=255)
    tenant_email = models.EmailField()
    tenant_phone = models.CharField(max_length=20, blank=True, default='')
    tenant_citizenship = models.CharField(max_length=100, blank=True, default='')

    # Snapshot of landlord info
    landlord_name = models.CharField(max_length=255)
    landlord_email = models.EmailField()
    landlord_phone = models.CharField(max_length=20, blank=True, default='')
    landlord_kyc_verified = models.BooleanField(default=False)

    # Snapshot of property info
    property_name = models.CharField(max_length=255)
    property_address = models.TextField()
    property_type = models.CharField(max_length=100)

    # Payment snapshot
    transaction_id = models.CharField(max_length=255, blank=True, default='')
    payment_date = models.DateTimeField(null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)

    # Tenant signature
    tenant_signature = models.TextField(blank=True, null=True, help_text="Base64 encoded signature image")
    tenant_signed_at = models.DateTimeField(null=True, blank=True)
    tenant_ip_address = models.CharField(max_length=45, blank=True, default='')
    tenant_device_info = models.TextField(blank=True, default='')

    # Landlord signature
    landlord_signature = models.TextField(blank=True, null=True, help_text="Base64 encoded signature image")
    landlord_signed_at = models.DateTimeField(null=True, blank=True)
    landlord_ip_address = models.CharField(max_length=45, blank=True, default='')
    landlord_device_info = models.TextField(blank=True, default='')

    # PDF
    agreement_pdf = models.FileField(upload_to='agreements/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Agreement #{self.id} - {self.property_name} ({self.get_status_display()})"


# ============================================================
# PAYMENT FAILURE INQUIRY MODEL
# Records when a payment fails so tenant can follow up
# ============================================================
class PaymentFailureInquiry(models.Model):
    INQUIRY_STATUS = (
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    )

    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payment_inquiries")
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_payment_inquiries")
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="payment_inquiries")
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name="payment_inquiries")
    message = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=INQUIRY_STATUS, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Inquiry #{self.id} - {self.tenant.username} -> {self.property.title}"