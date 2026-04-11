import AuthForm from "../components/AuthForm";
import AuthSplitLayout from "../components/AuthSplitLayout";

export default function LoginPage() {
  return (
    <AuthSplitLayout title="Welcome to Fayda ID Generator" subtitle="Sign in with your account to continue" mode="login">
      <AuthForm mode="login" />
    </AuthSplitLayout>
  );
}
