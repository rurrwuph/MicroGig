-- ==============================================================================
-- MicroGig PostgreSQL Initialization & Seed Script
-- Auto-executed by PostgreSQL container on first startup (/docker-entrypoint-initdb.d/)
-- ==============================================================================

-- Drop tables if needed (clean initialization)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS work_assignments CASCADE;
DROP TABLE IF EXISTS work_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------------------------
-- 1. Table Schemas
-- ------------------------------------------------------------------------------

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    balance NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    full_name VARCHAR(255),
    headline VARCHAR(255),
    bio VARCHAR(1000),
    skills VARCHAR(255),
    portfolio_url VARCHAR(255),
    github_url VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE work_requests (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    amount NUMERIC(38, 2) NOT NULL,
    deadline TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    category VARCHAR(255),
    skills VARCHAR(255),
    cancelled_at TIMESTAMP WITHOUT TIME ZONE,
    last_modified_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE work_assignments (
    id BIGSERIAL PRIMARY KEY,
    work_request_id BIGINT NOT NULL REFERENCES work_requests(id) ON DELETE CASCADE,
    freelancer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    submission_notes VARCHAR(2000),
    submission_url VARCHAR(255),
    feedback VARCHAR(2000),
    rating INTEGER,
    review VARCHAR(1000),
    revision_count INTEGER DEFAULT 0,
    cancellation_reason VARCHAR(1000),
    accepted_at TIMESTAMP WITHOUT TIME ZONE,
    submitted_at TIMESTAMP WITHOUT TIME ZONE,
    reviewed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_assignment_id BIGINT REFERENCES work_assignments(id) ON DELETE SET NULL,
    amount NUMERIC(38, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(1000),
    reference_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Seed Users
-- Password for all regular users: password123 ($2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a)
-- Password for admin: admin123 ($2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG)
-- ------------------------------------------------------------------------------

INSERT INTO users (id, username, email, password, role, balance, is_locked, full_name, headline, bio, skills, portfolio_url, github_url, created_at)
VALUES
-- Administrator (ID 1)
(1, 'admin', 'admin@microgig.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'ROLE_ADMIN', 0.00, false, 'System Administrator', 'MicroGig Platform Admin', 'Platform super administrator managing user disputes, escrow funds, and platform security.', 'System Administration, Security, Auditing', 'https://microgig.com', 'https://github.com/microgig', NOW() - INTERVAL '60 days'),

-- Clients (IDs 2 - 6)
(2, 'sarah_connor', 'sarah.connor@techvanguard.io', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_CLIENT', 8500.00, false, 'Sarah Connor', 'VP of Engineering @ TechVanguard', 'Leading high-growth engineering teams and building scalable cloud infrastructure. Always hiring top engineers.', 'Cloud Architecture, Microservices, Team Leadership', 'https://techvanguard.io', 'https://github.com/sarahconnor-tech', NOW() - INTERVAL '45 days'),
(3, 'alex_morgan', 'alex.morgan@novafin.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_CLIENT', 12400.00, false, 'Alex Morgan', 'Founder & CEO @ NovaFin Fintech', 'Serial entrepreneur creating modern decentralized finance tools and secure transaction processing engines.', 'Fintech, Product Strategy, Growth', 'https://novafin.com', 'https://github.com/alex-novafin', NOW() - INTERVAL '40 days'),
(4, 'elena_rostova', 'elena.rostova@cloudscale.net', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_CLIENT', 4200.00, false, 'Elena Rostova', 'Product Lead @ CloudScale Labs', 'Passionate about delightful developer experiences, sleek UI component design, and intelligent AI copilots.', 'Product Management, Agile, UX Strategy', 'https://cloudscale.net', 'https://github.com/elena-rostova', NOW() - INTERVAL '35 days'),
(5, 'marcus_vance', 'marcus.vance@shoppulse.io', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_CLIENT', 6100.00, false, 'Marcus Vance', 'Director of E-Commerce @ ShopPulse', 'Scaling high-conversion storefronts, omnichannel logistics, and real-time inventory management apps.', 'E-Commerce, Headless Commerce, Analytics', 'https://shoppulse.io', 'https://github.com/marcusvance', NOW() - INTERVAL '30 days'),
(6, 'david_kim', 'david.kim@healthai.med', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_CLIENT', 9000.00, false, 'David Kim', 'Head of Technology @ HealthAI', 'Deploying HIPAA-compliant machine learning solutions and digital care portals for modern clinics.', 'HealthTech, Machine Learning, HIPAA Compliance', 'https://healthai.med', 'https://github.com/davidkim-health', NOW() - INTERVAL '28 days'),

-- Freelancers (IDs 7 - 13)
(7, 'dev_john', 'john.doe@fullstack.dev', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 3450.00, false, 'John Doe', 'Senior Full-Stack & React Specialist', '7+ years building enterprise web apps with React, TypeScript, and Java Spring Boot. Passionate about clean code and performance.', 'React, TypeScript, Java, Spring Boot, PostgreSQL, TailwindCSS', 'https://johndoe.dev', 'https://github.com/johndoe-dev', NOW() - INTERVAL '50 days'),
(8, 'emma_cloud', 'emma.watson@cloudops.io', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 2800.00, false, 'Emma Watson', 'DevOps & Kubernetes Infrastructure Architect', 'AWS & CKA Certified DevOps engineer specializing in automated CI/CD pipelines, Docker multi-stage builds, and Terraform IaC.', 'Docker, Kubernetes, AWS, Terraform, GitHub Actions, Linux', 'https://emmawatson.cloud', 'https://github.com/emma-cloudops', NOW() - INTERVAL '48 days'),
(9, 'liam_ux', 'liam.neeson@designcraft.co', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 1950.00, false, 'Liam Neeson', 'Principal UI/UX Designer & Design Systems Lead', 'Crafting user-centric interfaces, atomic design libraries, and high-fidelity interactive prototypes with unmatched precision.', 'Figma, UI/UX Design, Design Systems, Wireframing, CSS3, Animation', 'https://liamux.design', 'https://github.com/liam-neeson-design', NOW() - INTERVAL '42 days'),
(10, 'sophia_backend', 'sophia.chen@scalecore.tech', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 4100.00, false, 'Sophia Chen', 'Distributed Systems & Spring Boot Specialist', 'High-throughput backend architectures, Postgres optimization, Redis caching, and resilient event-driven microservices.', 'Java 21, Spring Boot 3, PostgreSQL, Redis, Apache Kafka, Docker', 'https://sophiachen.dev', 'https://github.com/sophia-backend', NOW() - INTERVAL '38 days'),
(11, 'carlos_mobile', 'carlos.mendez@appcrafters.io', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 2200.00, false, 'Carlos Mendez', 'Mobile Engineer (React Native & Flutter)', 'Developing cross-platform mobile apps with native speed, smooth gestures, offline-first sync, and clean architecture.', 'React Native, Flutter, Dart, TypeScript, Firebase, SQLite', 'https://carlosmendez.app', 'https://github.com/carlos-mobile', NOW() - INTERVAL '32 days'),
(12, 'aisha_sec', 'aisha.patel@cyberguard.net', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 1750.00, false, 'Aisha Patel', 'Cybersecurity Consultant & Pen Tester', 'Securing web applications, penetration testing, automated security scans, and hardening containerized environments.', 'App Security, OWASP Top 10, Penetration Testing, JWT, OAuth2, Docker Hardening', 'https://aishapatel.security', 'https://github.com/aisha-sec', NOW() - INTERVAL '25 days'),
(13, 'viktor_ai', 'viktor.ivanov@aistudio.ai', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ROLE_FREELANCER', 3900.00, false, 'Viktor Ivanov', 'AI / ML Engineer & Python Data Specialist', 'Specializing in LLM application integration, RAG architectures, FastAPI inference microservices, and Postgres pgvector.', 'Python, PyTorch, LangChain, FastAPI, PostgreSQL, Vector Search, Pandas', 'https://viktor-ai.tech', 'https://github.com/viktor-ivanov-ai', NOW() - INTERVAL '20 days');

-- ------------------------------------------------------------------------------
-- 3. Seed Work Requests (22 Jobs across diverse categories and statuses)
-- ------------------------------------------------------------------------------

INSERT INTO work_requests (id, client_id, title, description, amount, deadline, status, category, skills, created_at)
VALUES
-- Completed Jobs (1 - 10)
(1, 2, 'Build Interactive Analytics Dashboard in React', 'Design and implement a responsive analytics dashboard with charts (Recharts/Chart.js), KPI summary cards, date range filtering, and CSV export functionality.', 1200.00, NOW() - INTERVAL '20 days', 'COMPLETED', 'Web Development', 'React, TypeScript, Chart.js, CSS3', NOW() - INTERVAL '30 days'),
(2, 2, 'Production Kubernetes Cluster Setup & CI/CD Pipeline', 'Deploy and configure a high-availability EKS Kubernetes cluster with automated GitHub Actions CI/CD workflows, ingress-nginx, and cert-manager for SSL.', 1500.00, NOW() - INTERVAL '15 days', 'COMPLETED', 'DevOps & Cloud', 'Kubernetes, Docker, GitHub Actions, AWS', NOW() - INTERVAL '25 days'),
(3, 3, 'PostgreSQL Database Performance Tuning & Indexing', 'Audit high-latency queries on a 50GB transactional database. Add optimal B-tree and GIN indexes, tune autovacuum and connection pooling parameters.', 950.00, NOW() - INTERVAL '18 days', 'COMPLETED', 'Backend Systems', 'PostgreSQL, SQL Tuning, Database Indexing', NOW() - INTERVAL '28 days'),
(4, 3, 'Fintech Mobile Wallet App UI/UX Redesign in Figma', 'Complete mobile UI/UX redesign for our consumer fintech wallet app including onboarding, KYC verification, card management, and transaction receipts.', 1400.00, NOW() - INTERVAL '12 days', 'COMPLETED', 'UI/UX Design', 'Figma, UI/UX Design, Wireframing, Prototyping', NOW() - INTERVAL '22 days'),
(5, 6, 'HIPAA Compliance Security Audit & API Penetration Test', 'Perform comprehensive security assessment and penetration testing on our REST APIs and cloud infrastructure to ensure full HIPAA compliance.', 1800.00, NOW() - INTERVAL '10 days', 'COMPLETED', 'Cybersecurity', 'Cybersecurity, Penetration Testing, OWASP, HIPAA', NOW() - INTERVAL '20 days'),
(6, 5, 'E-Commerce Product Recommendation Engine Microservice', 'Build a real-time collaborative filtering recommendation API in Python using FastAPI, Redis caching, and PostgreSQL for personalized product recommendations.', 2200.00, NOW() - INTERVAL '8 days', 'COMPLETED', 'AI & Machine Learning', 'Python, FastAPI, Machine Learning, Redis, PostgreSQL', NOW() - INTERVAL '18 days'),
(7, 4, 'Spring Boot Microservice for Real-Time Event Webhooks', 'Implement an event-driven webhook delivery engine in Spring Boot 3 with exponential backoff retry mechanism, signature verification, and delivery logging.', 850.00, NOW() - INTERVAL '7 days', 'COMPLETED', 'Backend Systems', 'Java, Spring Boot, PostgreSQL, Webhooks', NOW() - INTERVAL '16 days'),
(8, 5, 'Cross-Platform React Native Food Delivery Tracking App', 'Build a real-time order tracking and driver navigation screen in React Native with Mapbox integration and smooth bottom-sheet interactions.', 1600.00, NOW() - INTERVAL '5 days', 'COMPLETED', 'Mobile Apps', 'React Native, TypeScript, Mapbox, Mobile UI', NOW() - INTERVAL '14 days'),
(9, 4, 'Dark Mode & Glassmorphism Design System in React', 'Implement a comprehensive design system with light/dark theme toggle, glassmorphic card elements, modals, dropdowns, and accessible button variants.', 750.00, NOW() - INTERVAL '4 days', 'COMPLETED', 'Web Development', 'React, CSS Variables, Glassmorphism, UI Components', NOW() - INTERVAL '12 days'),
(10, 3, 'Docker Multi-Stage Optimization & Container Hardening', 'Refactor Dockerfiles for Java backend and Vite frontend to reduce image size by 70%, run as non-root user, and integrate Trivy security vulnerability scanning.', 600.00, NOW() - INTERVAL '3 days', 'COMPLETED', 'DevOps & Cloud', 'Docker, Security Hardening, Multi-Stage Builds', NOW() - INTERVAL '10 days'),

-- In-Progress / Review Jobs (11 - 14)
(11, 2, 'Implement JWT Token Refresh & Role-Based Access Control', 'Enhance authentication architecture with rotating refresh tokens stored in HTTP-only cookies, granular role permissions (Admin, Client, Freelancer), and route guards.', 700.00, NOW() + INTERVAL '5 days', 'ASSIGNED', 'Backend Systems', 'Java, Spring Security, JWT, PostgreSQL', NOW() - INTERVAL '6 days'),
(12, 4, 'SaaS Landing Page Redesign with Interactive Animations', 'Create a modern, high-converting SaaS landing page with dark mode aesthetics, hero section animations, interactive pricing calculator, and testimonial carousel.', 1100.00, NOW() + INTERVAL '7 days', 'ASSIGNED', 'UI/UX Design', 'Figma, UI/UX Design, Web Design, SaaS', NOW() - INTERVAL '5 days'),
(13, 6, 'Real-Time WebSocket Chat Feature for Patient Portal', 'Build an end-to-end encrypted real-time chat module connecting doctors and patients with typing indicators, read receipts, and file attachment support.', 1350.00, NOW() + INTERVAL '10 days', 'ASSIGNED', 'Web Development', 'React, WebSockets, Spring Boot, STOMP', NOW() - INTERVAL '4 days'),
(14, 5, 'Automated End-to-End Test Suite with Playwright', 'Set up comprehensive Playwright automated end-to-end testing suite for critical user journeys: signup, login, job posting, application submission, and checkout.', 900.00, NOW() + INTERVAL '12 days', 'ASSIGNED', 'Web Development', 'Playwright, TypeScript, QA Automation, CI/CD', NOW() - INTERVAL '3 days'),

-- Open Jobs for browsing and accepting (15 - 22)
(15, 3, 'Migrate Complex Monolith SQL Queries to QueryDSL & Spring Data', 'Refactor raw SQL strings into type-safe QueryDSL repositories with dynamic multi-criteria filtering, pagination, and automated unit tests.', 800.00, NOW() + INTERVAL '14 days', 'OPEN', 'Backend Systems', 'Java 21, QueryDSL, Spring Data JPA, PostgreSQL', NOW() - INTERVAL '2 days'),
(16, 4, 'Build Offline-First Note Taking Mobile App with WatermelonDB', 'Develop an offline-first mobile app in React Native using WatermelonDB for instantaneous local reads and background sync with cloud backend.', 1250.00, NOW() + INTERVAL '15 days', 'OPEN', 'Mobile Apps', 'React Native, WatermelonDB, SQLite, Sync Protocol', NOW() - INTERVAL '2 days'),
(17, 2, 'SOC-2 Type II Compliance Readiness Security Review', 'Perform gap analysis for SOC-2 Type II certification, audit IAM policies, configure logging & alerting in CloudWatch, and compile remediation report.', 2500.00, NOW() + INTERVAL '20 days', 'OPEN', 'Cybersecurity', 'SOC-2, Security Auditing, AWS IAM, Compliance', NOW() - INTERVAL '1 day'),
(18, 6, 'LLM Embeddings & Semantic Search Pipeline with pgvector', 'Integrate OpenAI embeddings into PostgreSQL using pgvector extension for sub-second semantic search across 100,000+ medical research documents.', 2000.00, NOW() + INTERVAL '18 days', 'OPEN', 'AI & Machine Learning', 'Python, pgvector, LangChain, OpenAI API, PostgreSQL', NOW() - INTERVAL '1 day'),
(19, 5, 'Shopify Headless Storefront Migration to Next.js & Tailwind', 'Migrate existing legacy Shopify theme into modern headless Next.js frontend utilizing Shopify Storefront GraphQL API with instant page loads.', 3000.00, NOW() + INTERVAL '25 days', 'OPEN', 'Web Development', 'Next.js, React, TailwindCSS, Shopify GraphQL', NOW() - INTERVAL '1 day'),
(20, 2, 'Grafana & Prometheus Observability Monitoring Stack', 'Configure end-to-end observability stack with Prometheus metric scrapers, Alertmanager Slack notifications, and custom Grafana dashboards for microservices.', 1100.00, NOW() + INTERVAL '16 days', 'OPEN', 'DevOps & Cloud', 'Prometheus, Grafana, Alertmanager, Docker', NOW() - INTERVAL '18 hours'),
(21, 6, 'Design Brand Identity & Vector Icon Set for Health Assistant', 'Create complete visual identity guidelines, logo marks, color palette specifications, and 40 custom SVG healthcare vector icons.', 650.00, NOW() + INTERVAL '10 days', 'OPEN', 'UI/UX Design', 'Figma, Illustrator, Icon Design, Branding', NOW() - INTERVAL '12 hours'),
(22, 5, 'Stripe Connect Marketplace Escrow Payment Integration', 'Implement multi-party split payments using Stripe Connect Custom Accounts with automated payout schedules, fee deductions, and webhook webhooks.', 1500.00, NOW() + INTERVAL '21 days', 'OPEN', 'Backend Systems', 'Java, Spring Boot, Stripe Connect, REST APIs', NOW() - INTERVAL '6 hours');

-- ------------------------------------------------------------------------------
-- 4. Seed Work Assignments (Matching the jobs above)
-- ------------------------------------------------------------------------------

INSERT INTO work_assignments (id, work_request_id, freelancer_id, status, submission_notes, submission_url, feedback, rating, review, revision_count, accepted_at, submitted_at, reviewed_at)
VALUES
-- Completed Assignments with 5-star ratings and authentic reviews (1 - 10)
(1, 1, 7, 'COMPLETED', 'Analytics dashboard delivered with full responsive layout, custom theme toggle, Recharts visualization, and CSV export functionality.', 'https://github.com/johndoe-dev/react-analytics-dashboard', 'Outstanding delivery! The dashboard is blazing fast and the charts look gorgeous.', 5, 'John is an absolute master of React and frontend architecture. He delivered ahead of schedule and the code quality is flawless. Highly recommend!', 0, NOW() - INTERVAL '29 days', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days'),

(2, 2, 8, 'COMPLETED', 'Configured HA Kubernetes cluster on AWS EKS with GitHub Actions CI/CD workflows, ingress-nginx controller, and SSL cert-manager.', 'https://github.com/emma-cloudops/eks-k8s-infrastructure', 'Flawless execution on our cloud infrastructure. Zero downtime during cutover.', 5, 'Emma set up our entire Kubernetes deployment pipeline smoothly. Super communicative, deep DevOps expertise, and documented every single step.', 0, NOW() - INTERVAL '24 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days'),

(3, 3, 10, 'COMPLETED', 'Analyzed slow query logs, restructured composite B-Tree indexes, added BRIN index on transaction history, and tuned postgresql.conf buffer settings.', 'https://github.com/sophia-backend/postgres-perf-optimization', 'Query execution times dropped from 850ms down to 12ms. Incredible work!', 5, 'Sophia possesses unmatched PostgreSQL knowledge. Our API latency plummeted immediately after her optimizations. Will definitely hire again.', 0, NOW() - INTERVAL '27 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days'),

(4, 4, 9, 'COMPLETED', 'Complete Figma design system and high-fidelity prototype covering 28 screens with mobile micro-interactions and dark mode palette.', 'https://figma.com/@liamux/novafin-mobile-wallet-v2', 'The design system is modern, clean, and our engineering team loves the Figma specs.', 5, 'Liam is a top-tier UI/UX designer. The prototype looked so good our investors were blown away. Exceptional attention to visual hierarchy.', 0, NOW() - INTERVAL '21 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days'),

(5, 5, 12, 'COMPLETED', 'Conducted comprehensive white-box penetration test and vulnerability assessment. Compiled 45-page HIPAA compliance remediation audit report.', 'https://aishapatel.security/reports/healthai-security-audit.pdf', 'Thorough audit that identified critical misconfigurations before our production launch.', 5, 'Aisha is a consummate security professional. Her actionable report gave us total confidence in our HIPAA compliance posture.', 0, NOW() - INTERVAL '19 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),

(6, 6, 13, 'COMPLETED', 'Developed high-performance FastAPI recommendation microservice with Redis caching and cosine similarity ranking. Benchmarked at 4,500 req/sec.', 'https://github.com/viktor-ivanov-ai/ecommerce-recommender-api', 'The recommendation microservice increased our average cart value by 18% in A/B testing!', 5, 'Viktor is a brilliant machine learning engineer. Super clean Python code, well-tested, and lightning fast inference speeds.', 0, NOW() - INTERVAL '17 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days'),

(7, 7, 10, 'COMPLETED', 'Implemented Spring Boot 3 webhook dispatcher with asynchronous RabbitMQ worker, HMAC-SHA256 signature verification, and delivery logging.', 'https://github.com/sophia-backend/spring-boot-webhook-service', 'Rock solid implementation. Webhooks are delivered reliably with automatic retries.', 5, 'Sophia delivered another flawless Spring Boot microservice. Clean architectural design and stellar unit test coverage.', 0, NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),

(8, 8, 11, 'COMPLETED', 'Completed React Native food tracking interface with live Mapbox geolocation updates, custom map markers, and animated driver bottom sheet.', 'https://github.com/carlos-mobile/react-native-delivery-tracker', 'Smooth 60fps animations and perfect iOS & Android parity.', 5, 'Carlos built an incredible tracking experience. Works smoothly on both operating systems with zero lag.', 0, NOW() - INTERVAL '13 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),

(9, 9, 7, 'COMPLETED', 'Built modular React component library with glassmorphic cards, accessible modals, and smooth theme switching using CSS custom properties.', 'https://github.com/johndoe-dev/glassmorphic-design-system', 'Beautiful glassmorphism styling and great responsive ergonomics.', 5, 'John created a gorgeous component library that made our entire web app look ultra-premium. Outstanding work!', 0, NOW() - INTERVAL '11 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),

(10, 10, 8, 'COMPLETED', 'Optimized backend & frontend Dockerfiles with multi-stage caching, Alpine minimal bases, and Trivy automated vulnerability scans in CI.', 'https://github.com/emma-cloudops/docker-optimization-templates', 'Reduced our Docker image sizes from 850MB to 110MB and cut build times in half.', 5, 'Emma transformed our Docker builds! Super fast CI/CD runs and secure non-root containers.', 0, NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

-- In-Review / Submitted Assignment (ID 11: DONE status awaiting client review)
(11, 11, 10, 'DONE', 'Implemented refresh token rotation pattern with Redis storage, HTTP-only secure cookies, and Spring Security method authorization annotations.', 'https://github.com/sophia-backend/jwt-rbac-security-pr', NULL, NULL, NULL, 0, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NULL),

-- Revision Requested Assignment (ID 12: REVISION_REQUESTED with client feedback)
(12, 12, 9, 'REVISION_REQUESTED', 'First iteration uploaded to Figma. Included hero section, pricing table, and testimonials carousel.', 'https://figma.com/@liamux/saas-landing-v1', 'The layout structure is fantastic, but could we please adjust the primary CTA gradient to match our brand purple (#7C3AED) and increase the contrast on the dark mode cards?', NULL, NULL, 1, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NULL),

-- Active In-Progress Assignment (ID 13: IN_PROGRESS)
(13, 13, 7, 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, 0, NOW() - INTERVAL '3 days', NULL, NULL),

-- Newly Accepted Assignment (ID 14: ACCEPTED)
(14, 14, 8, 'ACCEPTED', NULL, NULL, NULL, NULL, NULL, 0, NOW() - INTERVAL '2 days', NULL, NULL);

-- ------------------------------------------------------------------------------
-- 5. Seed Transactions (Complete ledger for top-ups, payouts, and withdrawals)
-- ------------------------------------------------------------------------------

INSERT INTO transactions (id, user_id, work_assignment_id, amount, type, description, created_at)
VALUES
-- Initial Top-ups by Clients
(1, 2, NULL, 10000.00, 'TOPUP', 'Initial Wallet Balance Top-up via Wire Transfer', NOW() - INTERVAL '44 days'),
(2, 3, NULL, 15000.00, 'TOPUP', 'Corporate Account Funding via Stripe', NOW() - INTERVAL '39 days'),
(3, 4, NULL, 6000.00, 'TOPUP', 'Product Department Budget Deposit', NOW() - INTERVAL '34 days'),
(4, 5, NULL, 10000.00, 'TOPUP', 'Quarterly Freelance Budget Allocation', NOW() - INTERVAL '29 days'),
(5, 6, NULL, 12000.00, 'TOPUP', 'HealthTech Innovation Grant Funding', NOW() - INTERVAL '27 days'),

-- Job 1 Payment (Sarah Connor -> John Doe: $1,200.00)
(6, 2, 1, -1200.00, 'DEBIT', 'Payment for job: "Build Interactive Analytics Dashboard in React" to @dev_john', NOW() - INTERVAL '20 days'),
(7, 7, 1, 1200.00, 'PAYMENT', 'Payout received for job: "Build Interactive Analytics Dashboard in React" from @sarah_connor', NOW() - INTERVAL '20 days'),

-- Job 2 Payment (Sarah Connor -> Emma Watson: $1,500.00)
(8, 2, 2, -1500.00, 'DEBIT', 'Payment for job: "Production Kubernetes Cluster Setup & CI/CD Pipeline" to @emma_cloud', NOW() - INTERVAL '15 days'),
(9, 8, 2, 1500.00, 'PAYMENT', 'Payout received for job: "Production Kubernetes Cluster Setup & CI/CD Pipeline" from @sarah_connor', NOW() - INTERVAL '15 days'),

-- Job 3 Payment (Alex Morgan -> Sophia Chen: $950.00)
(10, 3, 3, -950.00, 'DEBIT', 'Payment for job: "PostgreSQL Database Performance Tuning & Indexing" to @sophia_backend', NOW() - INTERVAL '18 days'),
(11, 10, 3, 950.00, 'PAYMENT', 'Payout received for job: "PostgreSQL Database Performance Tuning & Indexing" from @alex_morgan', NOW() - INTERVAL '18 days'),

-- Job 4 Payment (Alex Morgan -> Liam Neeson: $1,400.00)
(12, 3, 4, -1400.00, 'DEBIT', 'Payment for job: "Fintech Mobile Wallet App UI/UX Redesign in Figma" to @liam_ux', NOW() - INTERVAL '12 days'),
(13, 9, 4, 1400.00, 'PAYMENT', 'Payout received for job: "Fintech Mobile Wallet App UI/UX Redesign in Figma" from @alex_morgan', NOW() - INTERVAL '12 days'),

-- Job 5 Payment (David Kim -> Aisha Patel: $1,800.00)
(14, 6, 5, -1800.00, 'DEBIT', 'Payment for job: "HIPAA Compliance Security Audit & API Penetration Test" to @aisha_sec', NOW() - INTERVAL '10 days'),
(15, 12, 5, 1800.00, 'PAYMENT', 'Payout received for job: "HIPAA Compliance Security Audit & API Penetration Test" from @david_kim', NOW() - INTERVAL '10 days'),

-- Job 6 Payment (Marcus Vance -> Viktor Ivanov: $2,200.00)
(16, 5, 6, -2200.00, 'DEBIT', 'Payment for job: "E-Commerce Product Recommendation Engine Microservice" to @viktor_ai', NOW() - INTERVAL '8 days'),
(17, 13, 6, 2200.00, 'PAYMENT', 'Payout received for job: "E-Commerce Product Recommendation Engine Microservice" from @marcus_vance', NOW() - INTERVAL '8 days'),

-- Job 7 Payment (Elena Rostova -> Sophia Chen: $850.00)
(18, 4, 7, -850.00, 'DEBIT', 'Payment for job: "Spring Boot Microservice for Real-Time Event Webhooks" to @sophia_backend', NOW() - INTERVAL '7 days'),
(19, 10, 7, 850.00, 'PAYMENT', 'Payout received for job: "Spring Boot Microservice for Real-Time Event Webhooks" from @elena_rostova', NOW() - INTERVAL '7 days'),

-- Job 8 Payment (Marcus Vance -> Carlos Mendez: $1,600.00)
(20, 5, 8, -1600.00, 'DEBIT', 'Payment for job: "Cross-Platform React Native Food Delivery Tracking App" to @carlos_mobile', NOW() - INTERVAL '5 days'),
(21, 11, 8, 1600.00, 'PAYMENT', 'Payout received for job: "Cross-Platform React Native Food Delivery Tracking App" from @marcus_vance', NOW() - INTERVAL '5 days'),

-- Job 9 Payment (Elena Rostova -> John Doe: $750.00)
(22, 4, 9, -750.00, 'DEBIT', 'Payment for job: "Dark Mode & Glassmorphism Design System in React" to @dev_john', NOW() - INTERVAL '4 days'),
(23, 7, 9, 750.00, 'PAYMENT', 'Payout received for job: "Dark Mode & Glassmorphism Design System in React" from @elena_rostova', NOW() - INTERVAL '4 days'),

-- Job 10 Payment (Alex Morgan -> Emma Watson: $600.00)
(24, 3, 10, -600.00, 'DEBIT', 'Payment for job: "Docker Multi-Stage Optimization & Container Hardening" to @emma_cloud', NOW() - INTERVAL '3 days'),
(25, 8, 10, 600.00, 'PAYMENT', 'Payout received for job: "Docker Multi-Stage Optimization & Container Hardening" from @alex_morgan', NOW() - INTERVAL '3 days'),

-- Freelancer Withdrawals
(26, 7, NULL, -500.00, 'WITHDRAWAL', 'Payout via Bank Transfer (...4821)', NOW() - INTERVAL '3 days'),
(27, 8, NULL, -300.00, 'WITHDRAWAL', 'Payout via PayPal (emma@cloudops.io)', NOW() - INTERVAL '2 days'),
(28, 10, NULL, -700.00, 'WITHDRAWAL', 'Payout via Stripe Direct (...9914)', NOW() - INTERVAL '2 days'),
(29, 13, NULL, -500.00, 'WITHDRAWAL', 'Payout via Bank Transfer (...1102)', NOW() - INTERVAL '1 day');

-- ------------------------------------------------------------------------------
-- 6. Synchronize Sequence Counters
-- Prevents duplicate key errors on subsequent INSERT operations in the app
-- ------------------------------------------------------------------------------

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('work_requests_id_seq', (SELECT COALESCE(MAX(id), 1) FROM work_requests));
SELECT setval('work_assignments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM work_assignments));
SELECT setval('transactions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM transactions));
SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 1) FROM notifications));
