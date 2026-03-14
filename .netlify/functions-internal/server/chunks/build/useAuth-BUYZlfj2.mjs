import { computed, ref } from 'vue';
import { u as useSupabase } from './useSupabase-DR_u3VFp.mjs';

const user = ref(null);
const session = ref(null);
const loading = ref(true);
const useAuth = () => {
  const { client } = useSupabase();
  const isSignedIn = computed(() => !!user.value);
  async function init() {
    loading.value = true;
    try {
      const { data: { session: s } } = await client.auth.getSession();
      session.value = s;
      user.value = s?.user ?? null;
    } finally {
      loading.value = false;
    }
  }
  function onAuthStateChange(callback) {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, s) => {
      session.value = s;
      user.value = s?.user ?? null;
      callback(event, s);
    });
    return () => subscription.unsubscribe();
  }
  async function signInWithGoogle(redirectPath) {
    const base = "";
    const redirectTo = redirectPath ? `${base}${redirectPath.startsWith("/") ? redirectPath : "/" + redirectPath}` : `${base}/`;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) throw error;
  }
  async function signUpWithEmail(email, password, displayName) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : void 0
    });
    if (error) throw error;
    return data;
  }
  async function signInWithEmail(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signInWithMagicLink(email) {
    const { data, error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${""}/` }
    });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    user.value = null;
    session.value = null;
  }
  const accessToken = computed(() => session.value?.access_token ?? null);
  return {
    user,
    session,
    loading,
    isSignedIn,
    accessToken,
    init,
    onAuthStateChange,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signInWithMagicLink,
    signOut
  };
};

export { useAuth as u };
//# sourceMappingURL=useAuth-BUYZlfj2.mjs.map
