export type AppRole = "admin" | "boss" | "employee";

export interface Permissions {
  canViewAllTasks: boolean;
  canViewOwnTasksOnly: boolean;
  canAddTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canManageUsers: boolean;
  canApproveTask: boolean;
  canMonitorProgress: boolean;
  canMarkComplete: boolean;
}

export function getPermissions(role: AppRole): Permissions {
  switch (role) {
    case "admin":
      return {
        canViewAllTasks: true,
        canViewOwnTasksOnly: false,
        canAddTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canManageUsers: true,
        canApproveTask: true,
        canMonitorProgress: true,
        canMarkComplete: true,
      };
    case "boss":
      return {
        canViewAllTasks: true,
        canViewOwnTasksOnly: false,
        canAddTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canManageUsers: false,
        canApproveTask: true,
        canMonitorProgress: true,
        canMarkComplete: true,
      };
    case "employee":
      return {
        canViewAllTasks: false,
        canViewOwnTasksOnly: true,
        canAddTask: false,
        canEditTask: false,
        canDeleteTask: false,
        canManageUsers: false,
        canApproveTask: false,
        canMonitorProgress: false,
        canMarkComplete: true,
      };
  }
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  boss: "Boshliq",
  employee: "Xodim",
};

export const ROLE_META: Record<
  AppRole,
  { bg: string; text: string; icon: string; desc: string }
> = {
  admin: {
    bg: "#1e3a5f",
    text: "#ffffff",
    icon: "shield",
    desc: "Barcha topshiriqlar va foydalanuvchilarni boshqarish",
  },
  boss: {
    bg: "#7c3aed",
    text: "#ffffff",
    icon: "star",
    desc: "Topshiriqlarni qo'shish, tahrirlash va tasdiqlash",
  },
  employee: {
    bg: "#0891b2",
    text: "#ffffff",
    icon: "user",
    desc: "Faqat o'z topshiriqlarini ko'rish va bajarish",
  },
};
