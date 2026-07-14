from django.db import models
from django.contrib.auth.models import User

class Deal(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    buyer = models.ForeignKey(User, related_name='deals_bought', on_delete=models.CASCADE)
    seller = models.ForeignKey(User, related_name='deals_sold', on_delete=models.CASCADE)
    middleman = models.ForeignKey(User, related_name='deals_mediated', on_delete=models.SET_NULL, null=True, blank=True)
    item_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item_name} ({self.status})"