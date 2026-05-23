# Generated manually to add skipped_duplicates field to ImportBatch model
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reconciliation', '0003_banktransaction_receipt_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='importbatch',
            name='skipped_duplicates',
            field=models.IntegerField(default=0, verbose_name='Doublons ignorés'),
        ),
    ]
