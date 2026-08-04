import { Client, Case, Event, Avocat, Task, Invoice, Personnel, Fournisseur } from '../types';

export const initialClients: Client[] = [];

export const initialCases: Case[] = [];

export const initialEvents: Event[] = [];

export const initialAvocats: Avocat[] = [];

export const initialTasks: Task[] = [];

export const mockPersonnel: { name: string; role: string; status: string }[] = [];

export const initialConversations: { [key: string]: { sender: string; text: string; time: string }[] } = {};

export const initialInvoices: Invoice[] = [];

export const initialPersonnels: Personnel[] = [];

export const initialFournisseurs: Fournisseur[] = [];
