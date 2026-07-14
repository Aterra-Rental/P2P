from django.db import models
from django.contrib.auth.models import User
import secrets

class UserToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)

    @staticmethod
    def generate():
        return secrets.token_hex(32)