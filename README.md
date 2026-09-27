# MicroGig — Micro-Freelance Marketplace Platform

MicroGig is a modern full-stack freelance and gig economy web platform built with **Spring Boot 3 (Java 21)**, **React 19 / Vite**, and **PostgreSQL 15**, fully containerized with **Docker Compose**.

---

## ⚡ Quick Start (Docker)

1. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env to set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET if using Google OAuth
   ```

2. **Launch with Docker Compose:**
   ```bash
   docker compose up --build -d
   ```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **pgAdmin Database UI:** [http://localhost:5050](http://localhost:5050)

---

## 🧪 Automated Backend API Test Suite

Run the full end-to-end backend test suite (covering Auth, Work requests, Bids, Payments, Admin, RBAC, etc.):

- **Linux / macOS / Git Bash:**
  ```bash
  bash test_backend.sh
  ```
- **Windows PowerShell:**
  ```powershell
  .\test_backend.ps1
  ```

---

## 👥 Demo Logins

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Platform Administrator |
| **Client** | `sarah_connor` | `password123` | VP of Engineering ($8,500 budget) |
| **Client** | `alex_morgan` | `password123` | Fintech Founder ($12,400 budget) |
| **Freelancer** | `dev_john` | `password123` | React Specialist (5.0 rating, $3,450 balance) |
| **Freelancer** | `emma_cloud` | `password123` | DevOps Architect (5.0 rating, $2,800 balance) |
| **Freelancer** | `sophia_backend` | `password123` | Spring Boot Specialist (5.0 rating, $4,100 balance) |

---

## 🏗️ Architecture

- **Frontend:** React 19, Vite, React Router 7, Axios, Custom Glassmorphic Dark/Light Design System, Nginx Proxy.
- **Backend:** Java 21, Spring Boot 3.3.0, Spring Security (JWT auth with BCrypt), Spring Data JPA, Hibernate, OpenAPI / Swagger UI.
- **Database:** PostgreSQL 15 with automated Docker initialization and comprehensive seed data (`db/init.sql`).
- **Orchestration:** Docker Compose multi-container setup with healthchecks and isolated networks.
