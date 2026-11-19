import { Dashboard } from './components/dashboard/Dashboard';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { RepositoryProvider, useAppData, useAppRepository } from './storage/RepositoryProvider';

export default function App() {
  return (
    <RepositoryProvider>
      <AppInner />
    </RepositoryProvider>
  );
}

function AppInner() {
  const { profile, logs, hydrated } = useAppData();
  const { repository } = useAppRepository();

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-gradient-to-br from-strength-from to-cardio-to" />
          <p className="text-sm font-medium text-slate-500">Momentum</p>
        </div>
      </div>
    );
  }

  if (!profile?.onboardingCompleted) {
    return (
      <OnboardingFlow
        onComplete={(nextProfile) => {
          void repository.saveProfile(nextProfile);
        }}
      />
    );
  }

  return (
    <Dashboard
      profile={profile}
      logs={logs}
      onAddLog={(log) => {
        void repository.addLog(log);
      }}
      onDeleteLog={(id) => {
        void repository.deleteLog(id);
      }}
    />
  );
}
