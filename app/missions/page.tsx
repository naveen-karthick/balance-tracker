"use client";

import { useState, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import MonthlyMissions from "@/components/MonthlyMissions";
import SpotlightModal from "@/components/SpotlightModal";

const SPOTLIGHT_TASKS_KEY = "wealth-ledger-spotlight-tasks-seen";

function getTasksSpotlightSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SPOTLIGHT_TASKS_KEY) === "true";
}

function setTasksSpotlightSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPOTLIGHT_TASKS_KEY, "true");
}

export default function MissionsPage() {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showDriver, setShowDriver] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (!getTasksSpotlightSeen()) setShowIntroModal(true);
  }, []);

  const handleDismissIntroModal = () => {
    setShowIntroModal(false);
    setShowDriver(true);
  };

  useEffect(() => {
    if (!showDriver) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.6,
      steps: [
        {
          element: "#wealth-ledger-add-task",
          popover: {
            title: "Add Task",
            description:
              "Create monthly tasks with due dates. Enable notifications when adding or editing a task to get a reminder before it’s due.",
            side: "bottom" as const,
            align: "center" as const,
            showButtons: ["next", "close" as const],
            nextBtnText: "Next",
          },
        },
        {
          element: "#wealth-ledger-load-from-template-empty, #wealth-ledger-load-from-template-list",
          popover: {
            title: "Load Tasks from Template",
            description:
              "Use a saved template to add a full set of tasks in one go. Create templates from your current month to reuse later.",
            side: "bottom" as const,
            align: "center" as const,
            showButtons: ["close" as const],
            doneBtnText: "Got it",
          },
        },
      ],
      onDestroyed: () => {
        setTasksSpotlightSeen();
        setShowDriver(false);
        driverRef.current = null;
      },
    });
    driverRef.current = driverObj;
    const t = setTimeout(() => driverObj.drive(), 100);
    return () => {
      clearTimeout(t);
      if (driverRef.current?.isActive()) driverRef.current.destroy();
    };
  }, [showDriver]);

  return (
    <div className="pt-16 lg:pt-0">
      <MonthlyMissions />
      {showIntroModal && (
        <SpotlightModal
          isOpen={true}
          onDismiss={handleDismissIntroModal}
          title="Monthly Reminders"
        >
          <p>Track monthly tasks with due dates and reminders. Add one-off tasks or load from templates so recurring work stays in one place.</p>
        </SpotlightModal>
      )}
    </div>
  );
}
