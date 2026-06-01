from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import transaction, models
from .models import RentalAgreement, Booking, Property, Notification, KYC

from .serializers import (
    RentalAgreementSerializer,
    RentalAgreementListSerializer,
    TenantSignSerializer,
    LandlordSignSerializer,
)

from datetime import timedelta
import io
import os
from django.conf import settings

# =====================================================
# AGREEMENT CONTENT GENERATOR
# =====================================================

def generate_agreement_content(booking, property_obj, tenant, landlord_user, payment):
    """Generate the full legal text of the rental agreement"""
    from datetime import date

    today = date.today()
    lease_start = booking.check_in
    lease_end = booking.check_out
    duration_days = (lease_end - lease_start).days
    duration_months = max(1, round(duration_days / 30))

    property_type_display = dict(Property.PROPERTY_TYPES).get(property_obj.property_type, property_obj.property_type)

    tenant_profile = getattr(tenant, 'profile', None)
    tenant_phone = tenant_profile.phone if tenant_profile else ''
    landlord_profile = getattr(landlord_user, 'profile', None)
    landlord_phone = landlord_profile.phone if landlord_profile else ''

    kyc = KYC.objects.filter(user=landlord_user).first()
    landlord_kyc_status = kyc.status if kyc else 'not_submitted'

    tenant_kyc = KYC.objects.filter(user=tenant).first()
    tenant_citizenship = tenant_kyc.citizenship_number if tenant_kyc else ''

    content = f"""
DIGITAL RENTAL AGREEMENT

Agreement ID: AUTO-{booking.id}-{today.strftime('%Y%m%d')}
Date of Agreement: {today.strftime('%B %d, %Y')}

This Digital Rental Agreement ("Agreement") is entered into on {today.strftime('%B %d, %Y')} by and between:

LANDLORD:
{landlord_user.first_name} {landlord_user.last_name}
Email: {landlord_user.email}
Phone: {landlord_phone}
KYC Status: {landlord_kyc_status}

AND

TENANT:
{tenant.first_name} {tenant.last_name}
Email: {tenant.email}
Phone: {tenant_phone}
Citizenship Number: {tenant_citizenship if tenant_citizenship else 'N/A'}

PROPERTY DETAILS:
Property Name: {property_obj.title}
Address: {property_obj.address}, {property_obj.city}
Property Type: {property_type_display}
Bedrooms: {property_obj.bedrooms or 'N/A'}
Bathrooms: {property_obj.bathrooms or 'N/A'}

LEASE TERMS:
Lease Start Date: {lease_start.strftime('%B %d, %Y')}
Lease End Date: {lease_end.strftime('%B %d, %Y')}
Lease Duration: {duration_months} month(s)
Monthly Rent: NPR {property_obj.price}
Security Deposit: NPR {property_obj.security_deposit or 0}

PAYMENT DETAILS:
Transaction ID: {payment.transaction_id if payment else booking.esewa_transaction_id}
Payment Date: {payment.payment_date.strftime('%B %d, %Y %H:%M') if payment and payment.payment_date else timezone.now().strftime('%B %d, %Y %H:%M')}
Amount Paid: NPR {payment.amount if payment else booking.total_price}
Payment Method: eSewa

TERMS AND CONDITIONS:

1. LEASE TERM: The lease shall commence on {lease_start.strftime('%B %d, %Y')} and end on {lease_end.strftime('%B %d, %Y')}.

2. RENT: The Tenant agrees to pay a monthly rent of NPR {property_obj.price} due on the first day of each month.

3. SECURITY DEPOSIT: A security deposit of NPR {property_obj.security_deposit or 0} has been paid. This deposit will be held and returned subject to the terms of this agreement.

4. USE OF PREMISES: The premises shall be used exclusively as a private residence by the Tenant and approved occupants.

5. MAINTENANCE: The Tenant shall maintain the premises in good condition and promptly report any damages to the Landlord.

6. UTILITIES: Unless otherwise agreed, the Tenant is responsible for electricity, water, and internet utilities.

7. ALTERATIONS: The Tenant shall not make any structural alterations without prior written consent from the Landlord.

8. SUBLETTING: The Tenant shall not sublet the premises without prior written consent from the Landlord.

9. DEFAULT: If the Tenant fails to pay rent or breaches any term, the Landlord may terminate this agreement after providing written notice.

10. GOVERNING LAW: This Agreement shall be governed by the laws of Nepal.

11. ENTIRE AGREEMENT: This Agreement constitutes the entire agreement between the parties.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

________________________________    ________________________________
Landlord Signature                  Tenant Signature

Date: ____________                 Date: ____________
"""
    return content


# =====================================================
# AGREEMENT VIEWS
# =====================================================

class AgreementDetailView(generics.RetrieveAPIView):
    """Get a single rental agreement"""
    serializer_class = RentalAgreementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if is_admin:
            return RentalAgreement.objects.all()
        return RentalAgreement.objects.filter(
            models.Q(tenant=user) | models.Q(landlord=user)
        )


class AgreementListView(generics.ListAPIView):
    """List rental agreements for the current user"""
    serializer_class = RentalAgreementListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
        if is_admin:
            return RentalAgreement.objects.all().order_by('-created_at')
        return RentalAgreement.objects.filter(
            models.Q(tenant=user) | models.Q(landlord=user)
        ).order_by('-created_at')


class TenantSignAgreementView(views.APIView):
    """Tenant signs the rental agreement"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, agreement_id):
        try:
            agreement = RentalAgreement.objects.get(id=agreement_id, tenant=request.user)
        except RentalAgreement.DoesNotExist:
            return Response({"error": "Agreement not found"}, status=status.HTTP_404_NOT_FOUND)

        if agreement.status != 'pending_tenant':
            return Response(
                {"error": f"Agreement is in '{agreement.get_status_display()}' status. Only agreements awaiting tenant signature can be signed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TenantSignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agreement.tenant_signature = serializer.validated_data['signature']
        agreement.tenant_signed_at = timezone.now()
        agreement.tenant_ip_address = serializer.validated_data.get('ip_address', '') or request.META.get('REMOTE_ADDR', '')
        agreement.tenant_device_info = serializer.validated_data.get('device_info', '') or request.META.get('HTTP_USER_AGENT', '')
        agreement.status = 'pending_landlord'
        agreement.save()

        # Notify landlord
        Notification.objects.create(
            recipient=agreement.landlord,
            notification_type='agreement_tenant_signed',
            title='Tenant Signed Agreement',
            message=f"{agreement.tenant_name} has signed the rental agreement for {agreement.property_name}. Please review and sign.",
            related_entity_type='agreement',
            related_entity_id=agreement.id,
        )

        return Response(RentalAgreementSerializer(agreement).data, status=status.HTTP_200_OK)


class LandlordSignAgreementView(views.APIView):
    """Landlord signs the rental agreement"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, agreement_id):
        try:
            agreement = RentalAgreement.objects.get(id=agreement_id, landlord=request.user)
        except RentalAgreement.DoesNotExist:
            return Response({"error": "Agreement not found"}, status=status.HTTP_404_NOT_FOUND)

        if agreement.status != 'pending_landlord':
            return Response(
                {"error": f"Agreement is in '{agreement.get_status_display()}' status. Only agreements awaiting landlord signature can be signed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LandlordSignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agreement.landlord_signature = serializer.validated_data['signature']
        agreement.landlord_signed_at = timezone.now()
        agreement.landlord_ip_address = serializer.validated_data.get('ip_address', '') or request.META.get('REMOTE_ADDR', '')
        agreement.landlord_device_info = serializer.validated_data.get('device_info', '') or request.META.get('HTTP_USER_AGENT', '')
        agreement.status = 'active'
        agreement.save()

        # Mark the booking as confirmed now that agreement is fully signed
        booking = agreement.booking
        if booking and booking.status != 'confirmed':
            booking.status = 'confirmed'
            booking.save()

        # Notify tenant
        Notification.objects.create(
            recipient=agreement.tenant,
            notification_type='agreement_landlord_signed',
            title='Landlord Signed Agreement',
            message=f"{agreement.landlord_name} has signed the rental agreement for {agreement.property_name}. The agreement is now active.",
            related_entity_type='agreement',
            related_entity_id=agreement.id,
        )

        # Also notify tenant about activation
        Notification.objects.create(
            recipient=agreement.tenant,
            notification_type='agreement_activated',
            title='Agreement Activated',
            message=f"Your rental agreement for {agreement.property_name} is now active and legally binding.",
            related_entity_type='agreement',
            related_entity_id=agreement.id,
        )

        return Response(RentalAgreementSerializer(agreement).data, status=status.HTTP_200_OK)


class AgreementPDFView(views.APIView):
    """Generate and download agreement as PDF"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, agreement_id):
        try:
            user = request.user
            is_admin = user.is_superuser or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'
            if is_admin:
                agreement = RentalAgreement.objects.get(id=agreement_id)
            else:
                agreement = RentalAgreement.objects.get(
                    models.Q(id=agreement_id) & (models.Q(tenant=user) | models.Q(landlord=user))
                )
        except RentalAgreement.DoesNotExist:
            return Response({"error": "Agreement not found"}, status=status.HTTP_404_NOT_FOUND)

        pdf_data = generate_agreement_pdf(agreement)

        from django.http import HttpResponse
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="rental_agreement_{agreement.id}.pdf"'
        return response


def generate_agreement_pdf(agreement):
    """Generate a PDF for the rental agreement using fpdf2"""
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "RENTAL AGREEMENT", ln=True, align="C")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Agreement ID: AGR-{agreement.id:06d}", ln=True)
    pdf.cell(0, 6, f"Date: {agreement.created_at.strftime('%B %d, %Y')}", ln=True)
    pdf.ln(6)

    # Status badge
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(100, 100, 100)
    status_display = dict(RentalAgreement.AGREEMENT_STATUSES).get(agreement.status, agreement.status)
    pdf.cell(0, 6, f"Status: {status_display.upper()}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(8)

    # Section header
    def section(title):
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_fill_color(169, 137, 200)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 9, f"  {title}", ln=True, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(3)

    def field(label, value):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(50, 6, label + ":", ln=False)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, str(value), ln=True)

    # Property Information
    section("PROPERTY INFORMATION")
    field("Property Name", agreement.property_name)
    field("Address", agreement.property_address)
    field("Property Type", agreement.property_type)
    field("Monthly Rent", f"NPR {agreement.monthly_rent}")
    field("Security Deposit", f"NPR {agreement.security_deposit}")
    field("Lease Duration", f"{agreement.lease_duration_months} month(s)")
    pdf.ln(4)

    # Tenant Information
    section("TENANT INFORMATION")
    field("Full Name", agreement.tenant_name)
    field("Email", agreement.tenant_email)
    field("Phone", agreement.tenant_phone)
    field("Citizenship", agreement.tenant_citizenship or "N/A")
    pdf.ln(4)

    # Landlord Information
    section("LANDLORD INFORMATION")
    field("Full Name", agreement.landlord_name)
    field("Email", agreement.landlord_email)
    field("Phone", agreement.landlord_phone)
    field("KYC Verified", "Yes" if agreement.landlord_kyc_verified else "No")
    pdf.ln(4)

    # Payment Information
    section("PAYMENT INFORMATION")
    field("Transaction ID", agreement.transaction_id or "N/A")
    field("Payment Date", agreement.payment_date.strftime('%B %d, %Y %H:%M') if agreement.payment_date else "N/A")
    field("Amount Paid", f"NPR {agreement.amount_paid}")
    pdf.ln(4)

    # Terms and Conditions
    section("TERMS AND CONDITIONS")
    pdf.set_font("Helvetica", "", 9)
    terms = [
        "1. LEASE TERM: This agreement is for the lease period specified above.",
        "2. RENT: Monthly rent is due on the first day of each month.",
        "3. SECURITY DEPOSIT: The deposit will be returned subject to terms.",
        "4. USE OF PREMISES: The premises shall be used as a private residence only.",
        "5. MAINTENANCE: Tenant must maintain the premises in good condition.",
        "6. UTILITIES: Tenant is responsible for utility payments.",
        "7. ALTERATIONS: No structural changes without landlord consent.",
        "8. SUBLETTING: Subletting requires landlord's written consent.",
        "9. DEFAULT: Non-payment may result in agreement termination.",
        "10. GOVERNING LAW: Governed by the laws of Nepal.",
    ]
    for term in terms:
        pdf.cell(0, 5, term, ln=True)
    pdf.ln(8)

    # Signature blocks
    section("SIGNATURES")

    # Tenant signature
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "TENANT:", ln=True)
    if agreement.tenant_signature:
        # Save base64 image temporarily and embed
        import base64, tempfile
        sig_data = agreement.tenant_signature.split(',')[1] if ',' in agreement.tenant_signature else agreement.tenant_signature
        sig_bytes = base64.b64decode(sig_data)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            tmp.write(sig_bytes)
            tmp_path = tmp.name
        pdf.image(tmp_path, x=20, w=50, h=20)
        os.unlink(tmp_path)
        pdf.ln(22)
        pdf.set_font("Helvetica", "I", 8)
        signed_at = agreement.tenant_signed_at.strftime('%B %d, %Y at %H:%M') if agreement.tenant_signed_at else "Pending"
        pdf.cell(0, 4, f"Signed: {signed_at}", ln=True)
        pdf.cell(0, 4, f"IP: {agreement.tenant_ip_address or 'N/A'}", ln=True)
    else:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, "[Awaiting Signature]", ln=True)
        pdf.ln(22)
    pdf.ln(6)

    # Landlord signature
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "LANDLORD:", ln=True)
    if agreement.landlord_signature:
        import base64, tempfile
        sig_data = agreement.landlord_signature.split(',')[1] if ',' in agreement.landlord_signature else agreement.landlord_signature
        sig_bytes = base64.b64decode(sig_data)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            tmp.write(sig_bytes)
            tmp_path = tmp.name
        pdf.image(tmp_path, x=20, w=50, h=20)
        os.unlink(tmp_path)
        pdf.ln(22)
        pdf.set_font("Helvetica", "I", 8)
        signed_at = agreement.landlord_signed_at.strftime('%B %d, %Y at %H:%M') if agreement.landlord_signed_at else "Pending"
        pdf.cell(0, 4, f"Signed: {signed_at}", ln=True)
        pdf.cell(0, 4, f"IP: {agreement.landlord_ip_address or 'N/A'}", ln=True)
    else:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, "[Awaiting Signature]", ln=True)
        pdf.ln(22)
    pdf.ln(6)

    # Footer
    pdf.set_y(-30)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 4, f"Document generated by StayEasy - Agreement AGR-{agreement.id:06d}", ln=True, align="C")
    pdf.cell(0, 4, f"Page {pdf.page_no()}/{{nb}}", ln=True, align="C")
    pdf.alias_nb_pages()

    pdf_bytes = bytes(pdf.output())
    return pdf_bytes
