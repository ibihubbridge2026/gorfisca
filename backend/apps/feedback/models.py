from django.db import models
from django.utils import timezone
from django.conf import settings


class UserFeedback(models.Model):
    """
    Modèle pour collecter les feedbacks des utilisateurs sur les suggestions IA
    Permet d'améliorer la pertinence des suggestions de comptes OHADA
    """
    
    FEEDBACK_TYPES = [
        ('account_suggestion', 'Suggestion de compte'),
        ('magic_match', 'Magic Match'),
        ('document_analysis', 'Analyse de document'),
        ('journal_entry', 'Suggestion d\'écriture'),
    ]
    
    RATINGS = [
        (1, 'Très mauvais'),
        (2, 'Mauvais'),
        (3, 'Neutre'),
        (4, 'Bon'),
        (5, 'Excellent'),
    ]
    
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    feedback_type = models.CharField(max_length=50, choices=FEEDBACK_TYPES)
    rating = models.IntegerField(choices=RATINGS)
    
    # Contexte du feedback
    suggested_account_code = models.CharField(max_length=20, null=True, blank=True)
    suggested_account_label = models.CharField(max_length=200, null=True, blank=True)
    actual_account_code = models.CharField(max_length=20, null=True, blank=True)
    actual_account_label = models.CharField(max_length=200, null=True, blank=True)
    
    # Détails de la transaction/document
    transaction_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    transaction_description = models.TextField(null=True, blank=True)
    transaction_date = models.DateField(null=True, blank=True)
    
    # Commentaires utilisateur
    comment = models.TextField(null=True, blank=True)
    improvement_suggestion = models.TextField(null=True, blank=True)
    
    # Métadonnées
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'feedback_type', 'rating']),
            models.Index(fields=['suggested_account_code', 'actual_account_code']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Feedback {self.feedback_type} - {self.rating}/5 par {self.user.email}"


class FeedbackAggregation(models.Model):
    """
    Modèle pour stocker les agrégations de feedbacks
    Permet d'analyser les performances des suggestions IA
    """
    
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='feedback_aggregations'
    )
    feedback_type = models.CharField(max_length=50)
    account_code = models.CharField(max_length=20)
    
    # Statistiques
    total_feedbacks = models.IntegerField(default=0)
    average_rating = models.FloatField(default=0.0)
    correct_suggestions = models.IntegerField(default=0)
    incorrect_suggestions = models.IntegerField(default=0)
    
    # Période d'agrégation
    period_start = models.DateField()
    period_end = models.DateField()
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-period_end']
        indexes = [
            models.Index(fields=['organization', 'feedback_type', 'period_end']),
            models.Index(fields=['account_code', 'period_end']),
        ]
        unique_together = ['organization', 'feedback_type', 'account_code', 'period_start', 'period_end']
    
    def __str__(self):
        return f"Agrégation {self.feedback_type} - {self.account_code} - {self.average_rating:.1f}/5"
