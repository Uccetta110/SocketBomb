# Socketbomb

Un progetto scolastico per comunicazione **client ↔ server** tramite **Socket.io**, sviluppato in JavaScript.

---

## 👥 Partecipanti
- **DemoTV**
- **Uccetta110**
- **Nnhbvfc104**

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

---

### 🟢 Messaggi Client → Server (10N)
| Codice | Descrizione |
|--------|-------------|
| **101** | `this client ip is: <user.ipClient> | this client code is: <user.userCode>` |
| **102** | `yes, that's my ip` |

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

---

## 📝 Note
- Ogni messaggio mantiene la struttura numerica a tre cifre.
- I codici permettono una gestione semplice e chiara degli eventi Socket.io.
- La documentazione verrà aggiornata con l’aggiunta di nuovi messaggi.
