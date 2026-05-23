# Generated manually to add target_account field to ReconciliationRule model
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0001_initial'),
        ('reconciliation', '0006_add_banktransaction_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='reconciliationrule',
            name='target_account',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='accounting.account', verbose_name='Compte cible', help_text='Compte vers lequel matcher les transactions'),
            preserve_default=False,
        ),
    ]
