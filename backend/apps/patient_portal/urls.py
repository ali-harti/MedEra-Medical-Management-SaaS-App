from django.urls import path
from apps.patients.patient_views import PatientOwnRecordView
from apps.appointments.patient_views import PatientOwnAppointmentsView
from apps.consultations.patient_views import PatientOwnConsultationsView
from apps.prescriptions.patient_views import (
    PatientOwnPrescriptionsView,
    PatientPrescriptionPDFView
)
from apps.patient_portal.views import (
    PatientDashboardKPIView,
    PatientContactsView
)

urlpatterns = [
    # UC-PATIENT-02: View own dossier
    path('dossier/', 
         PatientOwnRecordView.as_view(),
         name='patient-own-record'),
    
    # UC-PATIENT-03: View own appointments
    path('appointments/', 
         PatientOwnAppointmentsView.as_view(),
         name='patient-own-appointments'),
    
    # UC-PATIENT-07: View consultation history
    path('consultations/', 
         PatientOwnConsultationsView.as_view(),
         name='patient-own-consultations'),
    
    # UC-PATIENT-04: View own prescriptions
    path('prescriptions/', 
         PatientOwnPrescriptionsView.as_view(),
         name='patient-own-prescriptions'),
    
    # UC-PATIENT-06: Download own prescription PDF
    path('prescriptions/<uuid:pk>/pdf/', 
         PatientPrescriptionPDFView.as_view(),
         name='patient-prescription-pdf'),
    
    # UC-PATIENT-XX: View dashboard KPIs
    path('dashboard/kpis/', 
         PatientDashboardKPIView.as_view(),
         name='patient-dashboard-kpis'),
    
    # UC-PATIENT-XX: View contacts (doctors & secretaries)
    path('contacts/', 
         PatientContactsView.as_view(),
         name='patient-contacts'),
]
