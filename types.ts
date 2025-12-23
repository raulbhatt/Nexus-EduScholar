export enum Topic {
  Astronomy = 'Astronomy',
  Astrophysics = 'Astrophysics',
  Cosmology = 'Cosmology',
  QuantumPhysics = 'Quantum Physics',
  ParticlePhysics = 'Particle Physics',
  AI = 'Artificial Intelligence',
  QuantumComputing = 'Quantum Computing',
  Neuroscience = 'Neuroscience'
}

export enum Level {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced'
}

export interface IndustryUpdate {
  headline: string;
  summary: string;
  date: string;
  imageKeyword: string;
}

export interface CuratedSubTopic {
  title: string;
  description: string;
  imageKeyword?: string;
}

export interface LearningContent {
  title: string;
  introduction: string;
  keyPoints: string[];
  deepDive: string;
  curatedSubTopics: CuratedSubTopic[];
  industryUpdates: IndustryUpdate[];
  vizPrompt: string; // Instruction for what the user should do with the viz
}

export interface SuggestedPath {
  nextConcept: string;
  rationale: string;
  connectionType: 'Prerequisite' | 'Deep Dive' | 'Evolution' | 'Application';
}

export interface ConceptDetail {
  explanation: string;
  suggestedPath: SuggestedPath;
  relatedConcepts: string[];
  practicalApplication: string;
  historicalContext: string;
  imageKeyword: string;
}

export interface VisualizationProps {
  topic: Topic;
  level: Level;
  isActive: boolean;
}