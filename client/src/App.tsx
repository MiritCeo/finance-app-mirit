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
import FixedCosts from "./pages/FixedCosts";
import Clients from "./pages/Clients";

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
      <Route path={"/fixed-costs"} component={FixedCosts} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
