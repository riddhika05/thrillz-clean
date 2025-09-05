import { supabase } from '../supabaseClient';

// Sign up with email, password, and role
export const signUp = async (email, password, role) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role, // store role in user_metadata
      },
    },
  });
  return { data, error };
};

// Log in with email & password
export const logIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Log out
export const logOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current session (if needed)
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};
