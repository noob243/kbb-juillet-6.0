
import React, { FC } from 'react';
import DashboardPage from './DashboardPage';
import ClientsPage from './ClientsPage';
import CasesPage from './CasesPage';
import EventsPage from './EventsPage';
import AgendaPage from './AgendaPage';
import ChatPage from './ChatPage';
import BillingPage from './BillingPage';
import AvocatsPage from './AvocatsPage';
import { Client, Case, Event, Task, Invoice, Avocat } from '../types';

interface AllInterfacesPageProps {
    clients: Client[];
    cases: Case[];
    events: Event[];
    tasks: Task[];
    invoices: Invoice[];
    avocats: Avocat[];
    lawyerNames: string[];
    onAddClient: (client: Omit<Client, 'id'>) => void;
    onAddCase: (dossier: Case) => void;
    onAddEvent: (event: Event) => void;
    onAddTask: (task: Omit<Task, 'id'>) => void;
    onAddInvoice: (invoice: Invoice) => void;
    onAddAvocat: (avocat: Avocat) => void;
    onExportClients: () => void;
    onExportCases: () => void;
}

const AllInterfacesPage: FC<AllInterfacesPageProps> = (props) => {
    return (
        <div className="space-y-12">
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Tableau de Bord</h2>
                <DashboardPage clients={props.clients} cases={props.cases} events={props.events} />
            </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Clients</h2>
                <ClientsPage clients={props.clients} onAddClient={props.onAddClient} onExport={props.onExportClients} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Dossiers</h2>
                <CasesPage cases={props.cases} clients={props.clients} onAddCase={props.onAddCase} onExport={props.onExportCases} avocats={props.avocats} invoices={props.invoices} tasks={props.tasks} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Événements</h2>
                <EventsPage events={props.events} onAddEvent={props.onAddEvent} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Agenda</h2>
                <AgendaPage tasks={props.tasks} cases={props.cases} lawyers={props.lawyerNames} avocats={props.avocats} onAddTask={props.onAddTask} />
            </div>
             <div className="h-[700px]">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Chat</h2>
                <ChatPage />
            </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Facturation</h2>
                <BillingPage invoices={props.invoices} cases={props.cases} onAddInvoice={props.onAddInvoice} />
            </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">Avocats</h2>
                <AvocatsPage avocats={props.avocats} onAddAvocat={props.onAddAvocat} />
            </div>
        </div>
    );
};

export default AllInterfacesPage;
