import { Case, Client } from '../types';

export const isCaseForClient = (caseRecord: Case, client: Client): boolean => {
    if (caseRecord.clientId != null && String(caseRecord.clientId) === String(client.id)) {
        return true;
    }

    return (caseRecord.client || '').trim().toLowerCase() === (client.name || '').trim().toLowerCase();
};

export const isActiveCase = (caseRecord: Case): boolean =>
    caseRecord.status === 'En cours' || caseRecord.status === 'Nouveau';
