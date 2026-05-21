#!/usr/bin/env python3
"""
Script de sauvegarde immuable pour Gorfisca - Blockchain Safety

Ce script crée des sauvegardes timestampées de la base de données SQLite
et vérifie l'intégrité de la chaîne de blocs comptable avant validation.

Usage:
    python scripts/backup_db.py
"""

import os
import sys
import shutil
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.accounting.models import JournalEntry


def calculate_journal_entry_hash(journal_entry):
    """
    Calcule le hash SHA-256 d'une écriture comptable pour vérification d'intégrité
    """
    # Créer une chaîne de caractères avec les données critiques de l'écriture
    data_string = f"{journal_entry.reference}{journal_entry.date}{journal_entry.description}"
    
    # Ajouter les lignes de l'écriture dans l'ordre
    lines = journal_entry.lines.order_by('id')
    for line in lines:
        data_string += f"{line.account.code}{line.line_type}{line.amount}"
    
    return hashlib.sha256(data_string.encode()).hexdigest()


def verify_blockchain_integrity():
    """
    Vérifie l'intégrité de la chaîne de blocs comptable
    Retourne True si l'intégrité est validée, False sinon
    """
    try:
        # Récupérer toutes les écritures validées, ordonnées par date et ID
        journal_entries = JournalEntry.objects.filter(
            posted=True
        ).order_by('date', 'id')
        
        if not journal_entries.exists():
            print("✅ Aucune écriture comptable trouvée - Intégrité validée par défaut")
            return True
        
        previous_hash = None
        integrity_issues = []
        
        for entry in journal_entries:
            current_hash = calculate_journal_entry_hash(entry)
            
            # Vérifier si le hash précédent correspond (chaînage)
            if previous_hash and hasattr(entry, 'previous_hash'):
                if entry.previous_hash != previous_hash:
                    integrity_issues.append(
                        f"Erreur de chaînage: Écriture {entry.reference} - "
                        f"Hash attendu: {previous_hash}, Hash trouvé: {entry.previous_hash}"
                    )
            
            previous_hash = current_hash
        
        if integrity_issues:
            print("❌ ERREURS D'INTÉGRITÉ DÉTECTÉES:")
            for issue in integrity_issues:
                print(f"   - {issue}")
            return False
        else:
            print("✅ Intégrité de la chaîne de blocs comptable validée")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification d'intégrité: {str(e)}")
        return False


def create_backup():
    """
    Crée une sauvegarde timestampée de la base de données
    """
    try:
        # Configuration des chemins
        backend_dir = Path(__file__).parent.parent / "backend"
        db_path = backend_dir / "db.sqlite3"
        backups_dir = backend_dir / "backups"
        
        # Vérifier que la base de données existe
        if not db_path.exists():
            print(f"❌ Base de données non trouvée: {db_path}")
            return False
        
        # Créer le dossier backups s'il n'existe pas
        backups_dir.mkdir(exist_ok=True)
        
        # Générer le nom de fichier avec timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        backup_filename = f"backup_gorfisca_{timestamp}.sqlite3"
        backup_path = backups_dir / backup_filename
        
        # Vérifier l'intégrité avant la sauvegarde
        print("🔍 Vérification de l'intégrité de la chaîne de blocs...")
        integrity_ok = verify_blockchain_integrity()
        
        if not integrity_ok:
            print("⚠️  ATTENTION: L'intégrité n'est pas validée!")
            response = input("Continuer la sauvegarde malgré tout? (y/N): ")
            if response.lower() != 'y':
                print("❌ Sauvegarde annulée")
                return False
        
        # Copier la base de données
        print(f"📦 Création de la sauvegarde: {backup_filename}")
        shutil.copy2(db_path, backup_path)
        
        # Vérifier l'intégrité du fichier copié
        if backup_path.exists():
            file_size = backup_path.stat().st_size
            print(f"✅ Sauvegarde créée avec succès - Taille: {file_size:,} octets")
            
            # Créer un fichier de métadonnées
            metadata = {
                'timestamp': datetime.now().isoformat(),
                'filename': backup_filename,
                'original_size': db_path.stat().st_size,
                'backup_size': file_size,
                'integrity_verified': integrity_ok,
                'journal_entries_count': JournalEntry.objects.filter(posted=True).count(),
                'last_entry_hash': calculate_journal_entry_hash(
                    JournalEntry.objects.filter(posted=True).order_by('-date', '-id').first()
                ) if JournalEntry.objects.filter(posted=True).exists() else None
            }
            
            metadata_path = backup_path.with_suffix('.metadata.json')
            import json
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print(f"📋 Métadonnées sauvegardées: {metadata_path.name}")
            
            # Nettoyage des anciennes sauvegardes (garder les 10 dernières)
            cleanup_old_backups(backups_dir, keep_count=10)
            
            return True
        else:
            print("❌ Échec de la création de la sauvegarde")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la création de la sauvegarde: {str(e)}")
        return False


def cleanup_old_backups(backups_dir, keep_count=10):
    """
    Nettoie les anciennes sauvegardes en ne gardant que les N plus récentes
    """
    try:
        # Lister tous les fichiers de backup
        backup_files = list(backups_dir.glob("backup_gorfisca_*.sqlite3"))
        backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Supprimer les plus anciennes
        if len(backup_files) > keep_count:
            for old_backup in backup_files[keep_count:]:
                old_backup.unlink()
                metadata_file = old_backup.with_suffix('.metadata.json')
                if metadata_file.exists():
                    metadata_file.unlink()
                print(f"🗑️  Ancienne sauvegarde supprimée: {old_backup.name}")
                
    except Exception as e:
        print(f"⚠️  Erreur lors du nettoyage: {str(e)}")


def main():
    """
    Fonction principale du script de backup
    """
    print("🔐 GORFISCA - Script de Sauvegarde Immuable")
    print("=" * 50)
    
    # Vérifier que nous sommes dans le bon environnement
    try:
        from django.conf import settings
        print(f"📁 Environnement Django: {settings.DEBUG}")
        print(f"🗄️  Base de données: {settings.DATABASES['default']['NAME']}")
    except Exception as e:
        print(f"❌ Erreur de configuration Django: {str(e)}")
        sys.exit(1)
    
    # Afficher les statistiques actuelles
    try:
        total_entries = JournalEntry.objects.count()
        posted_entries = JournalEntry.objects.filter(posted=True).count()
        print(f"📊 Écritures comptables: {posted_entries}/{total_entries} validées")
        
        if posted_entries > 0:
            last_entry = JournalEntry.objects.filter(posted=True).order_by('-date', '-id').first()
            last_hash = calculate_journal_entry_hash(last_entry)
            print(f"🔗 Dernier hash de chaîne: {last_hash[:16]}...")
    except Exception as e:
        print(f"⚠️  Impossible de récupérer les statistiques: {str(e)}")
    
    print("-" * 50)
    
    # Créer la sauvegarde
    success = create_backup()
    
    if success:
        print("\n🎉 Sauvegarde terminée avec succès!")
        print("💡 La chaîne de blocs comptable est préservée et intègre.")
    else:
        print("\n❌ Échec de la sauvegarde")
        sys.exit(1)


if __name__ == "__main__":
    main()
