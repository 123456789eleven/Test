import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import SignInModal from "./SignInModal";

export default function AuthButton() {
  const { user, isSignedIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="auth-btn"
        data-mode={isSignedIn ? "signout" : "signin"}
        onClick={() => (isSignedIn ? signOut() : setOpen(true))}
        title={isSignedIn ? user.email : undefined}
      >
        {isSignedIn ? `Sign out (${user.email})` : "Sign in to edit"}
      </button>
      {open && <SignInModal onClose={() => setOpen(false)} />}
    </>
  );
}
