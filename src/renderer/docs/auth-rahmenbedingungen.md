# Auth Rahmenbedingungen

## Produktanforderungen
- Passwort ist Pflicht bei der initialen Registrierung.
- Google-Login ist optional und dient als alternative Login-Methode.
- Google-Login ist nur online moeglich.
- Single-User pro Maschine.
- Daten muessen backupbar und auf anderer Maschine importierbar sein.
- Keine externen Services ausser Google.
- Daten bestehen aus Texten plus Settings inkl. sensiblen Feldern (z. B. E-Mail).

## Sicherheitsziele
- Zugriff auf die lokale Datenbank nur nach erfolgreicher Authentifizierung.
- Passwort- und Google-Login muessen jeweils eigenstaendig entsperren koennen.
- Auth-Methoden sollen nach dem Entsperren geaendert werden koennen.

## Empfohlene Umsetzung (Entscheidung)
- Eine zentrale Datenbank mit Vollverschluesselung (z. B. SQLCipher).
- Ein Data Encryption Key (DEK) fuer die DB.
- DEK wird nie im Klartext gespeichert, sondern pro Auth-Methode gewrappt:
  - Passwort: KDF (Argon2id bevorzugt, sonst PBKDF2) -> KEK -> AES-GCM wrap.
-  - Google: Electron safeStorage fuer lokales Secret -> AES-GCM wrap.
- Keyring-Datei im App-Datenverzeichnis speichert nur Wrapped-DEKs und KDF-Parameter.
- Backup/Import: Export enthaelt verschluesselte DB + Keyring-Datei.
  - Google-Wrap ist maschinenspezifisch; beim Import ist Passwort-Login der sichere Weg,
    danach kann Google erneut eingerichtet werden.

## Hinweise
- Google-Client-Secret darf nicht im Repo liegen; fuer Desktop ist PKCE ohne Secret korrekt.
