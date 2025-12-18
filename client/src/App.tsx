import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import EmployeeProfitSimulator from "./pages/EmployeeProfitSimulator";
import TimeReporting from "./pages/TimeReporting";
import EmployeeAnnualReport from "./pages/EmployeeAnnualReport";
import EmployeeCV from "./pages/EmployeeCV";
import FixedCosts from "./pages/FixedCosts";
import Clients from "./pages/Clients";
import TasksPage from "./pages/TasksPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import KnowledgeBaseEditPage from "./pages/KnowledgeBaseEditPage";
import KnowledgeBaseViewPage from "./pages/KnowledgeBaseViewPage";
import OfficePresence from "./pages/OfficePresence";
import Gamification from "./pages/Gamification";
import GamificationGuide from "./pages/GamificationGuide";
import VacationPlanning from "./pages/VacationPlanning";
import AIFinancialInsights from "./pages/AIFinancialInsights";
import EmployeeLogin from "./pages/EmployeeLogin";
import MyCV from "./pages/MyCV";
import AdminLogin from "./pages/AdminLogin";
import HRappkaMapping from "./pages/HRappkaMapping";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/admin-login"} component={AdminLogin} />
      <Route path={"/employee-login"} component={EmployeeLogin} />
      <Route path={"/my-cv"} component={MyCV} />
      <Route path={"/"}>
        <ProtectedRoute>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/employees"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <Employees />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/hrappka-mapping"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <HRappkaMapping />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/projects"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <Projects />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/clients"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <Clients />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/time-reporting"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <TimeReporting />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/simulator"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <EmployeeProfitSimulator />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/employee/:id/annual-report"}>
        {(params) => (
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout>
              <EmployeeAnnualReport />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/employee/:id/cv"}>
        {(params) => (
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout>
              <EmployeeCV />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/fixed-costs"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <FixedCosts />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/tasks"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <TasksPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/knowledge"}>
        <ProtectedRoute>
          <DashboardLayout>
            <KnowledgeBasePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/knowledge/new"}>
        <ProtectedRoute>
          <DashboardLayout>
            <KnowledgeBaseEditPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/knowledge/:id/edit"}>
        <ProtectedRoute>
          <DashboardLayout>
            <KnowledgeBaseEditPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/knowledge/:id"}>
        <ProtectedRoute>
          <DashboardLayout>
            <KnowledgeBaseViewPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/office-presence"}>
        <ProtectedRoute>
          <DashboardLayout>
            <OfficePresence />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/gamification"}>
        <ProtectedRoute>
          <DashboardLayout>
            <Gamification />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/gamification-info"}>
        <ProtectedRoute>
          <DashboardLayout>
            <GamificationGuide />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/vacation-planning"}>
        <ProtectedRoute>
          <DashboardLayout>
            <VacationPlanning />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/ai-insights"}>
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AIFinancialInsights />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
