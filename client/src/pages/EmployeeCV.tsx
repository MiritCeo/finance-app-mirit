import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Edit, Plus, Trash2, FileCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CV_TECHNOLOGIES, TECHNOLOGY_CATEGORIES, type Technology } from "../../../shared/cvTechnologies";

export default function EmployeeCV() {
  const { user } = useAuth();
  const params = useParams();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(params.id || "0");
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  const { data: cvData, isLoading, refetch } = trpc.employeeCV.get.useQuery(
    { employeeId },
    { enabled: !!user && employeeId > 0 }
  );
  
  const { data: projects } = trpc.projects.list.useQuery(undefined, { enabled: !!user });
  const { data: employee } = trpc.employees.getById.useQuery(
    { id: employeeId },
    { enabled: !!user && employeeId > 0 }
  );
  
  const createOrUpdateMutation = trpc.employeeCV.createOrUpdate.useMutation({
    onSuccess: () => {
      toast.success("CV zaktualizowane pomyślnie");
      refetch();
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('[EmployeeCV] Mutation error:', error);
      toast.error(`Błąd: ${error.message || 'Nie udało się zapisać CV'}`);
    },
  });
  
  const [formData, setFormData] = useState({
    yearsOfExperience: 0,
    summary: "", // Opis profilu (długi opis)
    tagline: "", // Krótki opis (2-3 zdania)
    seniorityLevel: "", // Poziom: Junior, Mid, Senior
    skills: [] as Array<{ name: string }>, // Umiejętności miękkie
    technologies: [] as Array<{ name: string; category?: string; proficiency: string }>, // Technologie (twarde)
    languages: [] as Array<{ name: string; level?: string }>, // Języki z poziomami
    projects: [] as Array<{
      projectId: number;
      description?: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      technologies?: string;
    }>,
  });
  
  const [newSkill, setNewSkill] = useState({ name: "" }); // Umiejętności miękkie - bez poziomu
  const [selectedCategory, setSelectedCategory] = useState("backend");
  const [selectedTechnology, setSelectedTechnology] = useState("");
  const [technologyProficiency, setTechnologyProficiency] = useState("intermediate");
  const [newLanguage, setNewLanguage] = useState({ name: "", level: "" }); // Języki
  const [projectForm, setProjectForm] = useState({
    projectId: "",
    description: "",
    role: "",
    startDate: "",
    endDate: "",
    technologies: "",
  });
  
  const resetForm = () => {
    if (cvData) {
      setFormData({
        yearsOfExperience: cvData.yearsOfExperience || 0,
        summary: cvData.summary || "",
        tagline: cvData.tagline || "",
        seniorityLevel: cvData.seniorityLevel || "",
        skills: cvData.skills?.map(s => ({ name: s.skillName })) || [],
        technologies: cvData.technologies?.map(t => ({ 
          name: t.technologyName, 
          category: t.category || undefined,
          proficiency: t.proficiency 
        })) || [],
        languages: cvData.languages?.map(l => ({ 
          name: l.languageName, 
          level: l.level || "" 
        })) || [],
        projects: cvData.projects?.map(p => ({
          projectId: p.projectId,
          description: p.projectDescription || "",
          role: p.role || "",
          startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : "",
          endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : "",
          technologies: p.technologies || "",
        })) || [],
      });
    } else {
      setFormData({
        yearsOfExperience: 0,
        summary: "",
        tagline: "",
        seniorityLevel: "",
        skills: [],
        technologies: [],
        languages: [],
        projects: [],
      });
    }
  };
  
  useEffect(() => {
    if (cvData) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvData]);
  
  const handleOpenEdit = () => {
    resetForm();
    setIsEditDialogOpen(true);
  };
  
  const handleAddSkill = () => {
    if (newSkill.name.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, { name: newSkill.name }],
      });
      setNewSkill({ name: "" });
    }
  };
  
  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    });
  };
  
  const handleAddTechnology = () => {
    if (selectedTechnology.trim()) {
      // Sprawdź czy technologia już nie została dodana
      if (formData.technologies.some(t => t.name === selectedTechnology)) {
        toast.error("Ta technologia została już dodana");
        return;
      }
      
      setFormData({
        ...formData,
        technologies: [...formData.technologies, { 
          name: selectedTechnology, 
          category: selectedCategory,
          proficiency: technologyProficiency 
        }],
      });
      setSelectedTechnology("");
      setTechnologyProficiency("intermediate");
    }
  };
  
  const handleRemoveTechnology = (index: number) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter((_, i) => i !== index),
    });
  };
  
  const handleAddLanguage = () => {
    if (newLanguage.name.trim()) {
      // Sprawdź czy język już nie został dodany
      if (formData.languages.some(l => l.name.toLowerCase() === newLanguage.name.toLowerCase())) {
        toast.error("Ten język został już dodany");
        return;
      }
      
      setFormData({
        ...formData,
        languages: [...formData.languages, { 
          name: newLanguage.name, 
          level: newLanguage.level || undefined
        }],
      });
      setNewLanguage({ name: "", level: "" });
    }
  };
  
  const handleRemoveLanguage = (index: number) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter((_, i) => i !== index),
    });
  };
  
  const handleAddProject = () => {
    if (projectForm.projectId) {
      setFormData({
        ...formData,
        projects: [...formData.projects, {
          projectId: parseInt(projectForm.projectId),
          description: projectForm.description,
          role: projectForm.role,
          startDate: projectForm.startDate || undefined,
          endDate: projectForm.endDate || undefined,
          technologies: projectForm.technologies || undefined,
        }],
      });
      setProjectForm({
        projectId: "",
        description: "",
        role: "",
        startDate: "",
        endDate: "",
        technologies: "",
      });
      setIsProjectDialogOpen(false);
    }
  };
  
  const handleRemoveProject = (index: number) => {
    setFormData({
      ...formData,
      projects: formData.projects.filter((_, i) => i !== index),
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Walidacja
    if (!employeeId || employeeId <= 0) {
      toast.error("Błąd: Nieprawidłowe ID pracownika");
      return;
    }
    
    console.log('[EmployeeCV] Submitting CV data:', {
      employeeId,
      yearsOfExperience: formData.yearsOfExperience,
      skillsCount: formData.skills.length,
      technologiesCount: formData.technologies.length,
      projectsCount: formData.projects.length,
    });
    
    createOrUpdateMutation.mutate({
      employeeId,
      yearsOfExperience: formData.yearsOfExperience,
      summary: formData.summary || undefined,
      tagline: formData.tagline || undefined,
      seniorityLevel: formData.seniorityLevel || undefined,
      skills: formData.skills.length > 0 ? formData.skills : undefined,
      technologies: formData.technologies.length > 0 ? formData.technologies : undefined,
      languages: formData.languages.length > 0 ? formData.languages : undefined,
      projects: formData.projects.length > 0 ? formData.projects : undefined,
    });
  };
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  const utils = trpc.useUtils();
  const { data: cvHistory } = trpc.employeeCV.getHistory.useQuery(
    { employeeId },
    { enabled: !!user && employeeId > 0 && !!cvData }
  );
  
  const generateHTMLMutation = trpc.employeeCV.generateHTML.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      toast.success("CV wygenerowane pomyślnie! Otwieranie w nowej zakładce...");
      // Otwórz CV w nowej zakładce z możliwością edycji
      window.open(`/cv/${data.historyId}`, '_blank');
      // Odśwież historię
      setTimeout(() => {
        utils.employeeCV.getHistory.invalidate({ employeeId });
      }, 1000);
    },
    onError: (error) => {
      console.error('[EmployeeCV] Generate HTML error:', error);
      toast.error(`Błąd podczas generowania CV: ${error.message || 'Nie udało się wygenerować CV'}`);
      setIsGenerating(false);
    },
  });
  
  const handleGenerateNewVersion = () => {
    if (confirm("Czy na pewno chcesz wygenerować nową wersję CV HTML na podstawie aktualnych danych pracownika? To wygeneruje profesjonalne CV z pomocą AI.")) {
      setIsGenerating(true);
      generateHTMLMutation.mutate({ employeeId });
    }
  };
  
  const handleGenerateNewVersionOld = () => {
    if (confirm("Czy na pewno chcesz wygenerować nową wersję CV na podstawie aktualnych danych pracownika?")) {
      // Automatycznie wypełnij formularz danymi z pracownika
      const updatedFormData = {
        ...formData,
        yearsOfExperience: formData.yearsOfExperience || 0,
        // Można dodać automatyczne pobieranie projektów z assignments
      };
      setFormData(updatedFormData);
      setIsEditDialogOpen(true);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-7xl py-8 space-y-6">
      <Button onClick={() => setLocation("/employees")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Wróć do listy pracowników
      </Button>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            CV - {employee?.firstName} {employee?.lastName}
          </h1>
          <p className="text-muted-foreground">
            {employee?.position || "Brak stanowiska"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenEdit} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edytuj CV
          </Button>
          <Button 
            onClick={handleGenerateNewVersion} 
            variant="default"
            disabled={isGenerating || !cvData}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 mr-2" />
                Wygeneruj CV HTML
              </>
            )}
          </Button>
        </div>
      </div>
      
      {!cvData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Brak CV dla tego pracownika</p>
            <Button onClick={handleOpenEdit}>
              <Plus className="w-4 h-4 mr-2" />
              Utwórz CV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Podstawowe informacje */}
          <Card>
            <CardHeader>
              <CardTitle>Podstawowe informacje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Lata doświadczenia</Label>
                <p className="text-lg font-semibold">{cvData.yearsOfExperience} lat</p>
              </div>
              {cvData?.seniorityLevel && (
                <div>
                  <Label className="text-sm text-muted-foreground">Poziom</Label>
                  <p className="text-lg font-semibold">{cvData.seniorityLevel}</p>
                </div>
              )}
              {cvData?.tagline && (
                <div>
                  <Label className="text-sm text-muted-foreground">Krótki opis (Tagline)</Label>
                  <p className="text-sm whitespace-pre-wrap">{cvData.tagline}</p>
                </div>
              )}
              {cvData?.summary && (
                <div>
                  <Label className="text-sm text-muted-foreground">Opis profilu</Label>
                  <p className="text-sm whitespace-pre-wrap">{cvData.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Umiejętności miękkie */}
          {cvData?.skills && Array.isArray(cvData.skills) && cvData.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Umiejętności miękkie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill.skillName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Języki */}
          {cvData?.languages && Array.isArray(cvData.languages) && cvData.languages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Języki</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cvData.languages.map((lang: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="font-medium">{lang.languageName || lang.name || "Nieznany język"}</span>
                      {lang.level && <span className="text-sm text-muted-foreground">{lang.level}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Technologie (umiejętności twarde) */}
          {cvData?.technologies && Array.isArray(cvData.technologies) && cvData.technologies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Technologie (umiejętności twarde)</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Grupuj technologie według kategorii
                  const grouped = cvData.technologies.reduce((acc, tech) => {
                    const category = tech.category || "inne";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(tech);
                    return acc;
                  }, {} as Record<string, typeof cvData.technologies>);
                  
                  return (
                    <div className="space-y-4">
                      {Object.entries(grouped).map(([category, techs]) => (
                        <div key={category}>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2 capitalize">
                            {TECHNOLOGY_CATEGORIES.find(c => c.value === category)?.label || category}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {techs?.map((tech, idx) => (
                              <Badge key={idx} variant="outline">
                                {tech.technologyName} ({tech.proficiency})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
          
          {/* Historia wygenerowanych CV */}
          {cvHistory && cvHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historia wygenerowanych CV</CardTitle>
                <CardDescription>
                  Ostatnie {cvHistory.length} wygenerowanych wersji CV (maksymalnie 5)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cvHistory.map((history) => (
                    <div
                      key={history.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            CV wygenerowane {new Date(history.generatedAt).toLocaleString('pl-PL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Wersja CV: {history.cvId}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`/cv/${history.id}`, '_blank');
                        }}
                      >
                        <FileCheck className="w-4 h-4 mr-2" />
                        Otwórz w nowej zakładce
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Projekty */}
          {cvData?.projects && Array.isArray(cvData.projects) && cvData.projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Projekty</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cvData.projects.map((project, idx) => {
                  const projectData = projects?.find(p => p.id === project.projectId);
                  return (
                    <div key={idx} className="border rounded-lg p-4">
                      <h4 className="font-semibold">{projectData?.name || `Projekt #${project.projectId}`}</h4>
                      {project.role && <p className="text-sm text-muted-foreground">Rola: {project.role}</p>}
                      {(project.startDate || project.endDate) && (
                        <p className="text-sm text-muted-foreground">
                          {project.startDate && new Date(project.startDate).toLocaleDateString('pl-PL')}
                          {project.startDate && project.endDate && " - "}
                          {project.endDate && new Date(project.endDate).toLocaleDateString('pl-PL')}
                        </p>
                      )}
                      {project.projectDescription && (
                        <p className="text-sm mt-2">{project.projectDescription}</p>
                      )}
                      {project.technologies && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.technologies.split(',').map((tech, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tech.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Dialog edycji CV */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edytuj CV</DialogTitle>
              <DialogDescription>
                Zaktualizuj informacje w CV pracownika
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Lata doświadczenia</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="seniorityLevel">Poziom</Label>
                <Select
                  value={formData.seniorityLevel}
                  onValueChange={(value) => setFormData({ ...formData, seniorityLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz poziom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Poziom doświadczenia pracownika
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tagline">Krótki opis (Tagline)</Label>
                <Textarea
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  rows={3}
                  placeholder="Krótki opis pracownika (2-3 zdania) - główny stack, typ projektów, kluczowe kompetencje..."
                />
                <p className="text-xs text-muted-foreground">
                  Krótki opis który pojawi się pod nazwiskiem w CV (2-3 zdania)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="summary">Opis profilu</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                  placeholder="Opisz doświadczenie i kompetencje pracownika (3-4 zdania)..."
                />
                <p className="text-xs text-muted-foreground">
                  Dłuższy opis profilu pracownika (3-4 zdania)
                </p>
              </div>
              
              {/* Umiejętności miękkie */}
              <div className="space-y-2">
                <Label>Umiejętności miękkie</Label>
                <p className="text-xs text-muted-foreground">
                  Wpisz umiejętności miękkie ręcznie (np. Komunikacja, Praca zespołowa, Zarządzanie czasem)
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nazwa umiejętności miękkiej"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddSkill} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {skill.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(idx)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Technologie (umiejętności twarde) */}
              <div className="space-y-2">
                <Label>Technologie (umiejętności twarde)</Label>
                <p className="text-xs text-muted-foreground">
                  Wybierz technologie z predefiniowanej listy
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={selectedCategory} onValueChange={(v) => {
                    setSelectedCategory(v);
                    setSelectedTechnology(""); // Resetuj wybór technologii przy zmianie kategorii
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {TECHNOLOGY_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedTechnology} 
                    onValueChange={setSelectedTechnology}
                    disabled={!CV_TECHNOLOGIES[selectedCategory]?.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz technologię" />
                    </SelectTrigger>
                    <SelectContent>
                      {CV_TECHNOLOGIES[selectedCategory]?.map(tech => (
                        <SelectItem key={tech.name} value={tech.name}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={technologyProficiency} onValueChange={setTechnologyProficiency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Początkujący</SelectItem>
                      <SelectItem value="intermediate">Średnio zaawansowany</SelectItem>
                      <SelectItem value="advanced">Zaawansowany</SelectItem>
                      <SelectItem value="expert">Ekspert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button" 
                  onClick={handleAddTechnology} 
                  variant="outline"
                  disabled={!selectedTechnology}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj technologię
                </Button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technologies.map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      {tech.name} ({tech.proficiency})
                      <button
                        type="button"
                        onClick={() => handleRemoveTechnology(idx)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Języki */}
              <div className="space-y-2">
                <Label>Języki</Label>
                <p className="text-xs text-muted-foreground">
                  Dodaj języki znane przez pracownika z poziomami (np. Polski - ojczysty, Angielski - B2 / C1)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nazwa języka (np. Polski, Angielski)"
                    value={newLanguage.name}
                    onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLanguage();
                      }
                    }}
                  />
                  <Input
                    placeholder="Poziom (np. ojczysty, B2, C1, B2 / C1 – swobodna komunikacja)"
                    value={newLanguage.level}
                    onChange={(e) => setNewLanguage({ ...newLanguage, level: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLanguage();
                      }
                    }}
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleAddLanguage} 
                  variant="outline"
                  disabled={!newLanguage.name.trim()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj język
                </Button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.languages.map((lang, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {lang.name}{lang.level ? ` - ${lang.level}` : ""}
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(idx)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Projekty */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Projekty</Label>
                  <Button
                    type="button"
                    onClick={() => setIsProjectDialogOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Dodaj projekt
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.projects.map((project, idx) => {
                    const projectData = projects?.find(p => p.id === project.projectId);
                    return (
                      <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{projectData?.name || `Projekt #${project.projectId}`}</p>
                          {project.role && <p className="text-sm text-muted-foreground">{project.role}</p>}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoveProject(idx)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  "Zapisz CV"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog dodawania projektu */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj projekt do CV</DialogTitle>
            <DialogDescription>
              Wybierz projekt i dodaj szczegóły dla CV
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Projekt</Label>
              <Select value={projectForm.projectId} onValueChange={(v) => setProjectForm({ ...projectForm, projectId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.filter(p => !formData.projects.find(proj => proj.projectId === p.id)).map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rola w projekcie</Label>
              <Input
                id="role"
                value={projectForm.role}
                onChange={(e) => setProjectForm({ ...projectForm, role: e.target.value })}
                placeholder="np. Lead Developer, Backend Developer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Opis projektu dla CV</Label>
              <Textarea
                id="description"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                rows={3}
                placeholder="Opisz projekt i osiągnięcia..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data rozpoczęcia</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data zakończenia</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="technologies">Technologie (oddzielone przecinkami)</Label>
              <Input
                id="technologies"
                value={projectForm.technologies}
                onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                placeholder="React, TypeScript, Node.js"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={handleAddProject}>
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}

