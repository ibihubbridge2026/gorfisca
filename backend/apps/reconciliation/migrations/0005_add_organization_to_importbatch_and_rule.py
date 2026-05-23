# Generated manually to add skipped_duplicates field to ImportBatch model
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reconciliation', '0004_add_skipped_duplicates_to_importbatch'),
    ]

    operations = [
        # Les champs organization et created_by ont déjà été ajoutés dans 0002_initial
        # Cette migration est maintenant vide car les champs existent déjà
    ]
