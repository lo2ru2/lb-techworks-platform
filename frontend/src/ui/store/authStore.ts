import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
};

type AuthState = {
  
  userToken: string | null;
  userProfile: UserProfile | null;
  
  adminToken: string | null;
  adminUser: UserProfile | null;

  
  loginUser: (token: string, profile: UserProfile) => void;
  loginAdmin: (token: string, profile: UserProfile) => void;
  logoutUser: () => void;
  logoutAdmin: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  isUserLoggedIn: () => boolean;
  isAdminLoggedIn: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userToken: null,
      userProfile: null,
      adminToken: null,
      adminUser: null,

      loginUser: (token, profile) =>
        set({ userToken: token, userProfile: profile }),

      loginAdmin: (token, profile) =>
        set({ adminToken: token, adminUser: profile }),

      logoutUser: () =>
        set({ userToken: null, userProfile: null }),

      logoutAdmin: () =>
        set({ adminToken: null, adminUser: null }),

      updateUserProfile: (partial) =>
        set((state) => ({
          userProfile: state.userProfile ? { ...state.userProfile, ...partial } : null,
        })),

      isUserLoggedIn: () => Boolean(get().userToken),
      isAdminLoggedIn: () => Boolean(get().adminToken),
    }),
    {
      name: 'lb-auth',
      partialize: (state) => ({
        userToken:   state.userToken,
        userProfile: state.userProfile,
        adminToken:  state.adminToken,
        adminUser:   state.adminUser,
      }),
    },
  ),
);
