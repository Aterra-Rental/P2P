from django.db import models
from django.contrib.auth.models import User
import secrets

class UserToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)

    @staticmethod
    def generate():
        return secrets.token_hex(32)


class Deal(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    buyer = models.ForeignKey(User, related_name='deals_as_buyer', on_delete=models.CASCADE)
    seller = models.ForeignKey(User, related_name='deals_as_seller', on_delete=models.CASCADE)
    item_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def to_dict(self):
        return {
            "id": self.id,
            "item_name": self.item_name,
            "price": str(self.price),
            "status": self.status,
            "buyer_id": self.buyer.username,
            "seller_id": self.seller.username,
        }