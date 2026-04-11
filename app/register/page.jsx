import AuthForm from "../components/AuthForm";
import AuthSplitLayout from "../components/AuthSplitLayout";

export default function RegisterPage() {
  return (
    <AuthSplitLayout title="Create account" subtitle="Set up your profile to start processing IDs" mode="register">
      <AuthForm mode="register" />
    </AuthSplitLayout>
  );
}
