import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  RouterProvider,
} from "react-aria-components";
import { useHref, useNavigate } from "react-router";
import { ResetDemoButton } from "../demo/ResetDemoButton";
import { Button } from "../ui/Button";
import { UserSwitcher } from "../users/UserSwitcher";
import { FeatureNav } from "./FeatureNav";
import "./MobileMenu.css";

export function MobileMenu() {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen && pending.current !== null) {
      const target = pending.current;
      pending.current = null;
      navigate(target);
    }
  }, [isOpen, navigate]);

  function leaveTo(path: string) {
    pending.current = path;
    setOpen(false);
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button variant="secondary">Meny</Button>
      <ModalOverlay className="mobile-menu-overlay">
        <Modal className="mobile-menu-panel">
          <Dialog>
            <RouterProvider
              navigate={(to) => leaveTo(String(to))}
              useHref={useHref}
            >
              <div className="mobile-menu-header">
                <Heading slot="title">Meny</Heading>
                <Button variant="quiet" onPress={() => setOpen(false)}>
                  Lukk meny
                </Button>
              </div>
              <div className="mobile-menu-body">
                <FeatureNav />
                <UserSwitcher />
                <ResetDemoButton goHome={() => leaveTo("/")} />
              </div>
            </RouterProvider>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
