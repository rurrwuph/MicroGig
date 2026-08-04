import React from 'react';
import {
  Zap,
  LayoutDashboard,
  Search,
  Plus,
  Briefcase,
  Wallet,
  User,
  Settings,
  LogOut,
  Check,
  Clock,
  Calendar,
  Star,
  Lock,
  AlertCircle,
  ArrowUpRight,
  ArrowLeft,
  ArrowDownLeft,
  X,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Code2,
  Building2,
  CreditCard,
  Send,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  HelpCircle,
  FileText,
  Sun,
  Moon,
  Bell,
  Edit3,
  Trash2,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

export const IconLogo = ({ size = 20, className = '' }) => (
  <Zap size={size} className={className} />
);

export const IconDashboard = ({ size = 16, className = '' }) => (
  <LayoutDashboard size={size} className={className} />
);

export const IconSearch = ({ size = 16, className = '' }) => (
  <Search size={size} className={className} />
);

export const IconPlus = ({ size = 16, className = '' }) => (
  <Plus size={size} className={className} />
);

export const IconBriefcase = ({ size = 16, className = '' }) => (
  <Briefcase size={size} className={className} />
);

export const IconWallet = ({ size = 16, className = '' }) => (
  <Wallet size={size} className={className} />
);

export const IconUser = ({ size = 16, className = '' }) => (
  <User size={size} className={className} />
);

export const IconSettings = ({ size = 16, className = '' }) => (
  <Settings size={size} className={className} />
);

export const IconLogout = ({ size = 16, className = '' }) => (
  <LogOut size={size} className={className} />
);

export const IconCheck = ({ size = 16, className = '' }) => (
  <Check size={size} className={className} />
);

export const IconClock = ({ size = 16, className = '' }) => (
  <Clock size={size} className={className} />
);

export const IconCalendar = ({ size = 16, className = '' }) => (
  <Calendar size={size} className={className} />
);

export const IconStar = ({ size = 16, filled = false, className = '' }) => (
  <Star
    size={size}
    fill={filled ? 'var(--clr-accent)' : 'none'}
    stroke="var(--clr-accent)"
    className={className}
  />
);

export const IconLock = ({ size = 16, className = '' }) => (
  <Lock size={size} className={className} />
);

export const IconAlert = ({ size = 16, className = '' }) => (
  <AlertCircle size={size} className={className} />
);

export const IconAlertCircle = ({ size = 16, className = '' }) => (
  <AlertCircle size={size} className={className} />
);

export const IconAlertTriangle = ({ size = 16, className = '' }) => (
  <AlertTriangle size={size} className={className} />
);

export const IconArrowUpRight = ({ size = 16, className = '' }) => (
  <ArrowUpRight size={size} className={className} />
);

export const IconArrowLeft = ({ size = 16, className = '' }) => (
  <ArrowLeft size={size} className={className} />
);

export const IconArrowDownLeft = ({ size = 16, className = '' }) => (
  <ArrowDownLeft size={size} className={className} />
);

export const IconClose = ({ size = 16, className = '' }) => (
  <X size={size} className={className} />
);

export const IconCheckCircle = ({ size = 16, className = '' }) => (
  <CheckCircle2 size={size} className={className} />
);

export const IconXCircle = ({ size = 16, className = '' }) => (
  <XCircle size={size} className={className} />
);

export const IconInfo = ({ size = 16, className = '' }) => (
  <Info size={size} className={className} />
);

export const IconRefresh = ({ size = 16, className = '' }) => (
  <RefreshCw size={size} className={className} />
);

export const IconSparkles = ({ size = 16, className = '' }) => (
  <Sparkles size={size} className={className} />
);

export const IconExternalLink = ({ size = 16, className = '' }) => (
  <ExternalLink size={size} className={className} />
);

export const IconCode = ({ size = 16, className = '' }) => (
  <Code2 size={size} className={className} />
);

export const IconBuilding = ({ size = 16, className = '' }) => (
  <Building2 size={size} className={className} />
);

export const IconCreditCard = ({ size = 16, className = '' }) => (
  <CreditCard size={size} className={className} />
);

export const IconSend = ({ size = 16, className = '' }) => (
  <Send size={size} className={className} />
);

export const IconRevision = ({ size = 16, className = '' }) => (
  <RotateCcw size={size} className={className} />
);

export const IconFilter = ({ size = 16, className = '' }) => (
  <SlidersHorizontal size={size} className={className} />
);

export const IconChevronRight = ({ size = 16, className = '' }) => (
  <ChevronRight size={size} className={className} />
);

export const IconFileText = ({ size = 16, className = '' }) => (
  <FileText size={size} className={className} />
);

export const IconFileCheck = ({ size = 16, className = '' }) => (
  <FileCheck size={size} className={className} />
);

export const IconHelp = ({ size = 16, className = '' }) => (
  <HelpCircle size={size} className={className} />
);

export const IconSun = ({ size = 16, className = '' }) => (
  <Sun size={size} className={className} />
);

export const IconMoon = ({ size = 16, className = '' }) => (
  <Moon size={size} className={className} />
);

export const IconBell = ({ size = 16, className = '' }) => (
  <Bell size={size} className={className} />
);

export const IconEdit = ({ size = 16, className = '' }) => (
  <Edit3 size={size} className={className} />
);

export const IconTrash = ({ size = 16, className = '' }) => (
  <Trash2 size={size} className={className} />
);
