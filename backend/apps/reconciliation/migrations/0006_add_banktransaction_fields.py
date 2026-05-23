# Generated manually to add missing fields to BankTransaction model
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reconciliation', '0005_add_organization_to_importbatch_and_rule'),
    ]

    operations = [
        # Les champs organization, created_by, matched_by et journal_line ont déjà été ajoutés dans 0002_initial
        # Cette migration est maintenant vide car les champs existent déjà
    ]
