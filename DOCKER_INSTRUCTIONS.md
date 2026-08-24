# MicroGig - Full-Stack Docker & Database Guide

This project is fully containerized using **Docker** and **Docker Compose**. It sets up an enterprise-grade environment including PostgreSQL, Spring Boot Backend, React Frontend (Nginx), and pgAdmin with comprehensive demo seed data preloaded.

---

## 🚀 Quick Start (Run with Docker)

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine.

### 2. Launch the Entire Stack
Open a terminal in the root directory of this project (`Project/`) and run:

```bash
docker compose up --build -d
```

> **Note:** The first build may take 1–2 minutes as it downloads base images, compiles the Spring Boot jar, and builds the React frontend. Subsequent starts take just a few seconds.

### 3. Access the Services

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:3000](http://localhost:3000) | Full React Web UI (Nginx reverse proxy) |
| **Backend REST API** | [http://localhost:8080](http://localhost:8080) | Spring Boot REST API |
| **Swagger API Docs** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) | Interactive OpenAPI documentation |
| **pgAdmin Database UI** | [http://localhost:5050](http://localhost:5050) | PostgreSQL web administration client |

---

## 👥 Demo User Credentials (Preloaded Seed Data)

All demo accounts are pre-populated with realistic profiles, transaction histories, jobs, and balances.

### 🔑 Administrator
| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | `ROLE_ADMIN` | Platform Super Administrator |

---

### 💼 Clients (Job Posters)
**Default Password for all clients:** `password123`

| Username | Full Name | Company / Headline | Initial Balance |
| :--- | :--- | :--- | :--- |
| `sarah_connor` | Sarah Connor | VP of Engineering @ TechVanguard | **$8,500.00** |
| `alex_morgan` | Alex Morgan | Founder & CEO @ NovaFin Fintech | **$12,400.00** |
| `elena_rostova` | Elena Rostova | Product Lead @ CloudScale Labs | **$4,200.00** |
| `marcus_vance` | Marcus Vance | Director of E-Commerce @ ShopPulse | **$6,100.00** |
| `david_kim` | David Kim | Head of Technology @ HealthAI | **$9,000.00** |

---

### 💻 Freelancers (Gig Workers)
**Default Password for all freelancers:** `password123`

| Username | Full Name | Specialization / Headline | Initial Balance |
| :--- | :--- | :--- | :--- |
| `dev_john` | John Doe | Senior Full-Stack & React Specialist | **$3,450.00** |
| `emma_cloud` | Emma Watson | DevOps & Kubernetes Infrastructure Architect | **$2,800.00** |
| `liam_ux` | Liam Neeson | Principal UI/UX Designer & Design Systems Lead | **$1,950.00** |
| `sophia_backend` | Sophia Chen | Distributed Systems & Spring Boot Specialist | **$4,100.00** |
| `carlos_mobile` | Carlos Mendez | Mobile Engineer (React Native & Flutter) | **$2,200.00** |
| `aisha_sec` | Aisha Patel | Cybersecurity Consultant & Pen Tester | **$1,750.00** |
| `viktor_ai` | Viktor Ivanov | AI / ML Engineer & Python Data Specialist | **$3,900.00** |

---

## 🗄️ Database Auto-Seeding

The database is initialized using [`db/init.sql`](file:///db/init.sql), mounted directly into `/docker-entrypoint-initdb.d/01_init.sql` inside the PostgreSQL container.

### What the Seed Script Populates:
- **13 Realistic Users** (1 Admin, 5 Clients, 7 Freelancers) with BCrypt-hashed passwords and profiles.
- **22 Work Requests** across various categories (*Web Development*, *Mobile Apps*, *UI/UX Design*, *Backend Systems*, *DevOps & Cloud*, *Cybersecurity*, *AI & Machine Learning*):
  - **10 Completed Jobs** with payouts, verified ratings (5-stars), and written reviews.
  - **4 In-Progress Jobs** demonstrating `DONE` (submitted awaiting review), `REVISION_REQUESTED` (with feedback), `IN_PROGRESS`, and `ACCEPTED` workflow states.
  - **8 Open Jobs** ready to be browsed, applied for, and accepted by freelancers.
- **29 Financial Transactions** covering initial wallet top-ups, client payment debits, freelancer earnings, and bank/PayPal withdrawals.
- **Auto-Increment Sequence Synchronization** so creating new records in the app won't cause primary key ID collisions.

---

## 🛠️ Useful Docker Commands

### View Live Logs
```bash
# View logs from all services:
docker compose logs -f

# View backend logs specifically:
docker compose logs -f backend

# View frontend logs:
docker compose logs -f frontend

# View database logs:
docker compose logs -f db
```

### Stop the Application
```bash
docker compose stop
```

### Restart the Application
```bash
docker compose start
```

### Reset & Re-Seed Database From Scratch
To wipe existing data and re-run [`db/init.sql`](file:///db/init.sql) fresh:
```bash
# Stop containers and delete named volumes:
docker compose down -v

# Re-launch and re-seed:
docker compose up --build -d
```

---

## 🖥️ Connecting to PostgreSQL via pgAdmin

1. Open [http://localhost:5050](http://localhost:5050)
2. Log in with:
   - **Email:** `admin@microgig.com`
   - **Password:** `admin`
3. Click **Add New Server**:
   - **General Tab -> Name:** `MicroGig Local`
   - **Connection Tab -> Host name/address:** `db`
   - **Port:** `5432`
   - **Maintenance database:** `microgig`
   - **Username:** `postgres`
   - **Password:** `postgres`
4. Click **Save**. You will see all tables (`users`, `work_requests`, `work_assignments`, `transactions`) and data.

---

## 💻 Hybrid Mode (Run Database in Docker, Code Locally)

If you are developing locally and want only the database running in Docker:

1. Start just PostgreSQL:
   ```bash
   docker compose up -d db
   ```
2. Start the Backend locally (in `backend/`):
   ```bash
   ./mvnw spring-boot:run
   # OR open in IntelliJ IDEA / VS Code and click Run MicroGigApplication
   ```
3. Start the Frontend locally (in `frontend/`):
   ```bash
   npm install
   npm run dev
   ```
   The local Vite dev server will run on `http://localhost:3000` and automatically proxy `/api` requests to backend on port `8080`.
