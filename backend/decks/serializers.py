from rest_framework import serializers
from .models import Deck, Flashcard

class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', 'deck', 'user', 'front', 'back', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class DeckSerializer(serializers.ModelSerializer):
    subdecks = serializers.SerializerMethodField()
    flashcard_count = serializers.ReadOnlyField()
    flashcards = serializers.SerializerMethodField()

    class Meta:
        model = Deck
        fields = ['id', 'title', 'user', 'parent', 'created_at', 'updated_at', 'subdecks', 'flashcard_count', 'flashcards']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'subdecks', 'flashcard_count', 'flashcards']

    def get_subdecks(self, obj):
        return DeckSerializer(obj.subdecks.all(), many=True).data

    def get_flashcards(self, obj):
        return FlashcardSerializer(obj.flashcards.all(), many=True).data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data) 