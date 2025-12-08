# SocketBomb

Un progetto scolastico per comunicazione **client ↔ server** tramite **Socket.io**, sviluppato in JavaScript.

---

## 📡 Struttura dei Codici Messaggi

I messaggi scambiati tra **server** e **client** seguono questo schema:

| Range | Origine | Significato |
|-------|---------|-------------|
| `00N` | Server  | Messaggi informativi del server |
| `10N` | Client  | Messaggi informativi del client |
| `20N` | Server  | Errori lato server |
| `30N` | Client  | Errori lato client |

---

## 📨 Messaggi Attualmente Implementati

### 🔵 Messaggi Server → Client (00N)
| Codice | Descrizione |
|--------|-------------|
| **001** | `Welcome to the server!` |
| **002** | `is your IP: <user.ipClient>` |
| **003** | `username saved: <userName>` |
| **004** | `new userName saved: + <userName>` |
| **005** | `new room added: + <room.code>` |
| **006** | `broadcast nuova stanza: + <room.code>` |
| **007** | `broadcast join stanza: + <room.code>` |
| **008** | `008 roomUpdate: + <userRoomList>.toJson` |
| **009** | `update to player his room status: + <room>` |
| **010** | `you are not in any room` |
| **011** | `broadcast user disconnection: <user.userCode>` |

---

### 🟢 Messaggi Client → Server (10N)
| Codice | Descrizione |
|--------|-------------|
| **101** | `this client ip is: <user.ipClient> | this client code is: <user.userCode> ! this client avatar is§ <user.avatar>` |
| **102** | `yes, that's my ip` |
| **103** | `my new username is: + <username>` |
| **104** | `104 join room code: + <room.code>` |

---

### 🔴 Errori Server (20N)
| Codice | Descrizione |
|--------|-------------|
| **201** | `user not found` |

---

### 🟠 Errori Client (30N)
| Codice | Descrizione |
|--------|-------------|
| **301** | `no, my ip is: <user.ipClient>` |
| **302** | `room empty: <sroom>` |
| **303** | `JSON room not valid: <sroom>` |

---

## 📝 Note
- Ogni messaggio mantiene la struttura numerica a tre cifre.
- I codici permettono una gestione semplice e chiara degli eventi Socket.io.
- La documentazione verrà aggiornata con l’aggiunta di nuovi messaggi.
