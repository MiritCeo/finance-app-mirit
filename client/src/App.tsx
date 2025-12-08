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
import AIFinancialInsights from "./pages/AIFinancialInsights";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/employees"} component={Employees} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/clients"} component={Clients} />
      <Route path={"/time-reporting"} component={TimeReporting} />
      <Route path={"/simulator"} component={EmployeeProfitSimulator} />
      <Route path={"/employee/:id/annual-report"} component={EmployeeAnnualReport} />
      <Route path={"/employee/:id/cv"} component={EmployeeCV} />
      <Route path={"/fixed-costs"} component={FixedCosts} />
      <Route path={"/tasks"} component={TasksPage} />
      <Route path={"/knowledge"} component={KnowledgeBasePage} />
      <Route path={"/ai-insights"} component={AIFinancialInsights} />
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
