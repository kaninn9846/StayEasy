from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    VerifyEmailView,
    CustomTokenObtainPairView,
    ForgotPasswordView,
    ResetPasswordView,
    RecentActivityView,
    CreateBookingRequestView,
    TenantBookingRequestListView,
    LandlordBookingRequestListView,
    BookingRequestDetailView,
    BookingRequestActionView,
    RetryPaymentView,
    ProfileView,
    LandlordRegisterView,
    LandlordLoginView,
    LandlordProfileView,
    LandlordPropertyCreateView,
    LandlordPropertyListView,
    LandlordPropertyDetailView,
    LandlordPropertyUpdateView,
    LandlordPropertyDeleteView,
    LandlordPropertyBookingsView,
    KYCSubmitView,
    KYCStatusView,
    KYCDetailView,
    PropertyCreateView,
    PropertyListView,
    PropertyDetailView,
    CheckBookingAvailabilityView,
    PropertyUpdateView,
    PropertyDeleteView,
    AdminKYCListView,
    AdminKYCDetailView,
    AdminKYCUpdateStatusView,
    AdminKYCStatsView,
    AdminPropertyListView,
    LandlordDashboardView,
    BookingCreateView,
    UserBookingListView,
    LandlordBookingListView,
    LandlordTenantPaymentHistoryView,
    LandlordPaymentHistoryView,
    LandlordRefundListView,
    BookingDetailView,
    BookingCancelView,
    InitiateEsewaPaymentView,
    VerifyEsewaPaymentView,
    ProcessPaymentView,
    AdminBookingListView,
    AdminBookingUpdateStatusView,
    AdminUserListView,
    AdminUserDetailView,
    AdminLandlordListView,
    AdminWarnUserView,
    AdminSuspendUserView,
    AdminLiftSuspensionView,
    AdminAddNoteView,
    AdminModerationHistoryView,
    AdminPropertyToggleVisibilityView,
    CheckSuspensionStatusView,
    UserWarningListView,
    MarkWarningReadView,
    UserFavoriteListView,
    FavoriteToggleView,
    ViewedPropertyListView,
    ViewPropertyView,
)
from .notification_views import (
    NotificationListView,
    NotificationDetailView,
    NotificationUnreadCountView,
    MarkAllNotificationsReadView,
)
from .agreement_views import (
    AgreementDetailView,
    AgreementListView,
    TenantSignAgreementView,
    LandlordSignAgreementView,
    AgreementPDFView,
)
from .chat_views import (
    UserChatListView,
    LandlordChatListView,
    ChatDetailView,
    ChatCreateView,
    SendMessageView,
    GetChatMessagesView,
    StartChatFromPropertyView,
    ConversationListView,
    ConversationDetailView,
    ConversationMessageView,
    GetOrCreateConversationView,
)

urlpatterns = [
    # User Authentication Endpoints
    path('register/', RegisterView.as_view()),
    path('verify-email/', VerifyEmailView.as_view()),
    path('forgot-password/', ForgotPasswordView.as_view()),
    path('reset-password/', ResetPasswordView.as_view()),
    path('login/', CustomTokenObtainPairView.as_view()),
    path('refresh/', TokenRefreshView.as_view()),

    # User Profile Endpoints
    path('profile/', ProfileView.as_view()),
    path('recent-activity/', RecentActivityView.as_view()),
    path('kyc/submit/', KYCSubmitView.as_view()),
    path('kyc/status/', KYCStatusView.as_view()),
    path('kyc/detail/', KYCDetailView.as_view()),
    
    # =====================================================
    # LANDLORD AUTHENTICATION & MANAGEMENT ENDPOINTS
    # =====================================================
    path('landlord/register/', LandlordRegisterView.as_view(), name='landlord-register'),
    path('landlord/login/', LandlordLoginView.as_view(), name='landlord-login'),
    path('landlord/profile/', LandlordProfileView.as_view(), name='landlord-profile'),
    
    # Landlord Property Management
    path('landlord/properties/create/', LandlordPropertyCreateView.as_view(), name='landlord-property-create'),
    path('landlord/properties/', LandlordPropertyListView.as_view(), name='landlord-property-list'),
    path('landlord/properties/<int:id>/', LandlordPropertyDetailView.as_view(), name='landlord-property-detail'),
    path('landlord/properties/<int:id>/update/', LandlordPropertyUpdateView.as_view(), name='landlord-property-update'),
    path('landlord/properties/<int:id>/delete/', LandlordPropertyDeleteView.as_view(), name='landlord-property-delete'),
    path('landlord/properties/<int:property_id>/bookings/', LandlordPropertyBookingsView.as_view(), name='landlord-property-bookings'),
    path('landlord/bookings/', LandlordBookingListView.as_view(), name='landlord-booking-list'),
    path('landlord/payments/', LandlordPaymentHistoryView.as_view(), name='landlord-payment-history'),
    path('landlord/payments/<int:tenant_id>/', LandlordTenantPaymentHistoryView.as_view(), name='landlord-tenant-payments'),
    path('landlord/refunds/', LandlordRefundListView.as_view(), name='landlord-refund-list'),
    
    # =====================================================
    # USER PROPERTY & BOOKING ENDPOINTS
    # =====================================================
    path('property/add/', PropertyCreateView.as_view()),
    
    # Property Endpoints
    path('properties/', PropertyListView.as_view(), name='property-list'),
    path('properties/<int:id>/', PropertyDetailView.as_view(), name='property-detail'),
    path('bookings/check-availability/', CheckBookingAvailabilityView.as_view(), name='check-availability'),
    path('property/update/<int:id>/', PropertyUpdateView.as_view(), name='property-update'),
    path('property/delete/<int:id>/', PropertyDeleteView.as_view(), name='property-delete'),
    
    # Booking Endpoints
    path('bookings/create/', BookingCreateView.as_view(), name='booking-create'),
    path('bookings/', UserBookingListView.as_view(), name='user-booking-list'),
    path('bookings/<int:id>/', BookingDetailView.as_view(), name='booking-detail'),
    path('bookings/<int:id>/cancel/', BookingCancelView.as_view(), name='booking-cancel'),
    
    # eSewa 2.0 Payment Endpoints
    path('payment/esewa/initiate/', InitiateEsewaPaymentView.as_view(), name='initiate-esewa-payment'),
    path('payment/esewa/verify/', VerifyEsewaPaymentView.as_view(), name='verify-esewa-payment'),
    path('bookings/pay/', ProcessPaymentView.as_view(), name='process-payment'),  # Legacy
    
    # Favorite Endpoints
    path('favorites/', UserFavoriteListView.as_view(), name='user-favorite-list'),
    path('favorites/toggle/', FavoriteToggleView.as_view(), name='favorite-toggle'),
    
    # Viewed Property Endpoints
    path('viewed-properties/', ViewedPropertyListView.as_view(), name='viewed-property-list'),
    path('view-property/', ViewPropertyView.as_view(), name='view-property'),
    
    # =====================================================
    # CHAT ENDPOINTS
    # =====================================================
    # User chat endpoints
    path('chats/', UserChatListView.as_view(), name='user-chat-list'),
    path('chats/<int:id>/', ChatDetailView.as_view(), name='chat-detail'),
    path('chats/create/', ChatCreateView.as_view(), name='chat-create'),
    path('chats/<int:chat_id>/send-message/', SendMessageView.as_view(), name='send-message'),
    path('chats/<int:chat_id>/messages/', GetChatMessagesView.as_view(), name='get-messages'),
    path('chats/start-from-property/', StartChatFromPropertyView.as_view(), name='start-chat-from-property'),
    
    # New conversation endpoints (Socket.IO compatible)
    path('chat/conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('chat/conversations/<int:id>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('chat/conversations/<int:id>/messages/', ConversationMessageView.as_view(), name='conversation-messages'),
    path('chat/get-or-create/', GetOrCreateConversationView.as_view(), name='get-or-create-conversation'),
    
    # Landlord chat endpoints
    path('landlord/chats/', LandlordChatListView.as_view(), name='landlord-chat-list'),
    
    # =====================================================
    # ADMIN MANAGEMENT ENDPOINTS
    # =====================================================
    # Admin KYC Management Endpoints
    path('admin/kyc/', AdminKYCListView.as_view(), name='admin-kyc-list'),
    path('admin/kyc/<int:id>/', AdminKYCDetailView.as_view(), name='admin-kyc-detail'),
    path('admin/kyc/<int:id>/update-status/', AdminKYCUpdateStatusView.as_view(), name='admin-kyc-update-status'),
    path('admin/kyc/stats/', AdminKYCStatsView.as_view(), name='admin-kyc-stats'),
    
    # Admin Property Management
    path('admin/properties/', AdminPropertyListView.as_view(), name='admin-property-list'),
    
    # Admin User Management
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/landlords/', AdminLandlordListView.as_view(), name='admin-landlord-list'),
    
    # Admin Booking Management
    path('admin/bookings/', AdminBookingListView.as_view(), name='admin-booking-list'),
    path('admin/bookings/<int:id>/update-status/', AdminBookingUpdateStatusView.as_view(), name='admin-booking-update-status'),
    
    # =====================================================
    # MODERATION ENDPOINTS
    # =====================================================
    # Admin moderation actions
    path('admin/users/<int:user_id>/warn/', AdminWarnUserView.as_view(), name='admin-warn-user'),
    path('admin/users/<int:user_id>/suspend/', AdminSuspendUserView.as_view(), name='admin-suspend-user'),
    path('admin/suspensions/<int:suspension_id>/lift/', AdminLiftSuspensionView.as_view(), name='admin-lift-suspension'),
    path('admin/users/<int:user_id>/note/', AdminAddNoteView.as_view(), name='admin-add-note'),
    path('admin/users/<int:user_id>/moderation-history/', AdminModerationHistoryView.as_view(), name='admin-moderation-history'),
    path('admin/properties/<int:property_id>/toggle-visibility/', AdminPropertyToggleVisibilityView.as_view(), name='admin-property-toggle-visibility'),
    
    # User-facing moderation endpoints
    path('suspension-status/', CheckSuspensionStatusView.as_view(), name='suspension-status'),
    path('warnings/', UserWarningListView.as_view(), name='user-warning-list'),
    path('warnings/<int:warning_id>/mark-read/', MarkWarningReadView.as_view(), name='warning-mark-read'),
    
    # =====================================================
    # NOTIFICATION ENDPOINTS
    # =====================================================
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/mark-all-read/', MarkAllNotificationsReadView.as_view(), name='notification-mark-all-read'),

    # =====================================================
    # RENTAL AGREEMENT ENDPOINTS
    # =====================================================
    path('agreements/', AgreementListView.as_view(), name='agreement-list'),
    path('agreements/<int:pk>/', AgreementDetailView.as_view(), name='agreement-detail'),
    path('agreements/<int:agreement_id>/sign-tenant/', TenantSignAgreementView.as_view(), name='agreement-sign-tenant'),
    path('agreements/<int:agreement_id>/sign-landlord/', LandlordSignAgreementView.as_view(), name='agreement-sign-landlord'),
    path('agreements/<int:agreement_id>/pdf/', AgreementPDFView.as_view(), name='agreement-pdf'),

    # =====================================================
    # BOOKING REQUEST ENDPOINTS
    # =====================================================
    path('booking-requests/create/', CreateBookingRequestView.as_view(), name='booking-request-create'),
    path('booking-requests/my-requests/', TenantBookingRequestListView.as_view(), name='booking-request-my'),
    path('booking-requests/received/', LandlordBookingRequestListView.as_view(), name='booking-request-received'),
    path('booking-requests/<int:pk>/', BookingRequestDetailView.as_view(), name='booking-request-detail'),
    path('booking-requests/<int:pk>/action/', BookingRequestActionView.as_view(), name='booking-request-action'),
    path('booking-requests/<int:pk>/retry-payment/', RetryPaymentView.as_view(), name='booking-request-retry-payment'),
]