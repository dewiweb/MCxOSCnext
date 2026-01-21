# MCxOSC - Guide d'utilisation

## Introduction

MCxOSC est un pont bidirectionnel entre les protocoles **Ember+** et **OSC**. Il permet de :
- Contrôler des équipements Ember+ (consoles LAWO, matrices Riedel) via OSC
- Recevoir des valeurs Ember+ et les transmettre en OSC
- Créer des mappings personnalisés entre paramètres

## Interface utilisateur

### Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────┐
│  MCxOSC                    [Status] [Status] [Status]  [⚙️]    │
├──────────────┬─────────────────────────────────────────────────┤
│              │                                                 │
│  Sessions    │  [Connections]                [+ New Connection]│
│  ─────────   │  ┌─────────────────────────────────────────────┐│
│  ▸ Session1  │  │ Status │ Ember+ Path │ OSC Address │ Value  ││
│  ▸ Session2  │  │   🟢   │   1.2.3.4   │  /fader/1   │  0.75  ││
│              │  │   ⚪   │   1.2.3.5   │  /fader/2   │  0.00  ││
│  Ember+ Tree │  └─────────────────────────────────────────────┘│
│  ──────────  │                                                 │
│  ▸ Console   │                                                 │
│    ▸ Faders  │                                                 │
│    ▸ Matrix  │                                                 │
│              │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

### Barre de statut

| Indicateur | Signification |
|------------|---------------|
| 🟢 Ember+ Connected | Connecté au device Ember+ |
| 🔴 Ember+ Disconnected | Non connecté |
| 🟢 OSC Listening | Port OSC actif |
| 🟢 WebSocket | Interface connectée au backend |

## Configuration des devices

### Accéder à la configuration

1. Cliquez sur l'icône ⚙️ dans le coin supérieur droit
2. La fenêtre de configuration s'ouvre

### Configurer le device Ember+

C'est l'équipement que vous voulez contrôler (console, matrice, etc.)

| Champ | Description | Exemple |
|-------|-------------|---------|
| Host/IP | Adresse IP du device Ember+ | `192.168.1.100` |
| Port | Port Ember+ (généralement 9000) | `9000` |

Cliquez **[Connect]** pour établir la connexion.

### Configurer le device OSC

C'est l'équipement qui envoie/reçoit les messages OSC (contrôleur, QLab, etc.)

| Champ | Description | Exemple |
|-------|-------------|---------|
| RX Port | Port sur lequel MCxOSC écoute | `8000` |
| TX Host | IP du device OSC cible | `192.168.1.200` |
| TX Port | Port du device OSC cible | `9000` |

Cliquez **[Apply & Restart OSC]** pour appliquer.

## Créer des connexions

Une **connexion** est un mapping entre un paramètre Ember+ et une adresse OSC.

### Méthode 1: Via l'arbre Ember+

1. Dans le panneau gauche, développez l'arbre Ember+
2. Naviguez jusqu'au paramètre souhaité
3. Cliquez sur le paramètre (type PARAMETER)
4. Le formulaire de création s'ouvre avec le chemin pré-rempli
5. Entrez l'adresse OSC souhaitée
6. Configurez le scaling si nécessaire
7. Cliquez **[Create Connection]**

### Méthode 2: Création manuelle

1. Cliquez **[+ New Connection]**
2. Remplissez le formulaire :

| Champ | Description | Exemple |
|-------|-------------|---------|
| Ember+ Path | Chemin dans l'arbre Ember+ | `1.2.3.4` |
| OSC Address | Adresse OSC | `/fader/1/volume` |
| Type | Type de paramètre | `INTEGER`, `REAL`, `BOOLEAN` |
| Curve | Courbe de scaling | `lin` (linéaire) ou `log` |
| Ember Min/Max | Plage de valeurs Ember+ | `0` / `1000` |
| OSC Min/Max | Plage de valeurs OSC | `0` / `1` |

3. Cliquez **[Create Connection]**

## Gérer les connexions

### Activer/Désactiver

- 🟢 **Actif** : La connexion transmet les valeurs
- ⚪ **Inactif** : La connexion est configurée mais ne transmet pas

Actions :
- ▶️ Activer une connexion
- ⏸️ Désactiver une connexion
- **[Activate All]** : Active toutes les connexions

### Supprimer

Cliquez sur 🗑️ pour supprimer une connexion.

## Sessions

Les sessions permettent de sauvegarder et charger vos configurations.

### Sauvegarder une session

1. Dans le panneau Sessions, cliquez **[+]**
2. Entrez un nom
3. Cliquez **[Save]**

### Charger une session

1. Survolez une session dans la liste
2. Cliquez 📂 pour charger

### Écraser une session

1. Survolez la session
2. Cliquez 💾 pour sauvegarder par-dessus

## Scaling des valeurs

MCxOSC convertit automatiquement les valeurs entre Ember+ et OSC.

### Exemple linéaire

```
Ember+ : 0 à 1000
OSC    : 0 à 1

Ember+ 500 → OSC 0.5
OSC 0.25   → Ember+ 250
```

### Exemple logarithmique

Pour les faders audio (perception dB logarithmique) :

```
Type  : INTEGER
Curve : log

Ember+ 500 → OSC ~0.85 (courbe log)
```

## Flux de données

### Ember+ → OSC

1. Le device Ember+ envoie une mise à jour
2. MCxOSC reçoit la valeur
3. Applique le scaling configuré
4. Envoie le message OSC au device cible

### OSC → Ember+

1. Le device OSC envoie un message
2. MCxOSC reçoit sur le port RX
3. Trouve la connexion correspondante
4. Applique le scaling inverse
5. Envoie la valeur à l'équipement Ember+

## Bonnes pratiques

### Éviter les boucles de feedback

MCxOSC inclut un rate limiter qui empêche les boucles :
- Une direction est prioritaire pendant 500ms
- Les mises à jour trop rapides sont filtrées

### Nommer les adresses OSC

Utilisez des adresses descriptives :
```
✅ /console/fader/ch1/volume
✅ /matrix/crosspoint/1/2
❌ /a
❌ /1
```

### Sauvegarder régulièrement

Sauvegardez vos sessions après chaque modification importante.

## Dépannage

### "Ember+ Disconnected"

1. Vérifiez que le device Ember+ est allumé
2. Vérifiez l'IP : `ping 192.168.1.100`
3. Vérifiez le port (généralement 9000)
4. Recliquez **[Connect]** dans la config

### "Connexion reste inactive"

1. Vérifiez que le chemin Ember+ existe dans l'arbre
2. Vérifiez que le type de paramètre est correct
3. Le paramètre doit être de type PARAMETER (pas NODE)

### "OSC ne reçoit pas"

1. Vérifiez que le port RX n'est pas utilisé par une autre app
2. Vérifiez les règles firewall
3. Testez avec un outil OSC (TouchOSC, Protokol)

### "Valeurs incorrectes"

1. Vérifiez les plages Min/Max Ember+ et OSC
2. Vérifiez le type de courbe (lin vs log)
3. Vérifiez le factor pour les entiers Ember+

## Support

Pour signaler un bug ou demander une fonctionnalité :
- Ouvrez une issue sur GitHub
- Incluez les logs du backend si possible
