from rest_framework import serializers
from .models import UserFeedback, FeedbackAggregation


class UserFeedbackSerializer(serializers.ModelSerializer):
    """
    Serializer pour les feedbacks utilisateurs
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = UserFeedback
        fields = [
            'id', 'feedback_type', 'rating', 'suggested_account_code',
            'suggested_account_label', 'actual_account_code', 
            'actual_account_label', 'transaction_amount', 
            'transaction_description', 'transaction_date', 'comment',
            'improvement_suggestion', 'ai_confidence', 'ai_enabled',
            'created_at', 'user_email'
        ]
        read_only_fields = ['id', 'created_at', 'user_email']
    
    def validate_rating(self, value):
        """Valider que le rating est entre 1 et 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Le rating doit être entre 1 et 5.")
        return value
    
    def validate(self, data):
        """Valider la cohérence des données"""
        if data.get('suggested_account_code') and not data.get('actual_account_code'):
            raise serializers.ValidationError(
                "actual_account_code est requis quand suggested_account_code est fourni"
            )
        return data


class FeedbackAggregationSerializer(serializers.ModelSerializer):
    """
    Serializer pour les agrégations de feedbacks
    """
    accuracy_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = FeedbackAggregation
        fields = [
            'id', 'feedback_type', 'account_code', 'total_feedbacks',
            'average_rating', 'correct_suggestions', 'incorrect_suggestions',
            'accuracy_rate', 'period_start', 'period_end', 'updated_at'
        ]
    
    def get_accuracy_rate(self, obj):
        """Calculer le taux de précision"""
        if obj.total_feedbacks == 0:
            return 0
        return round((obj.correct_suggestions / obj.total_feedbacks) * 100, 2)
