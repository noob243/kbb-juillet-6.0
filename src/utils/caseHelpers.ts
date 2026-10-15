import { Case, Client } from '../types';

export const isCaseForClient = (caseRecord: Case, client: Client): boolean => {
    if (caseRecord.clientId != null && String(caseRecord.clientId) === String(client.id)) {
        return true;
    }

    const caseClientName = (caseRecord.client || '').trim().toLowerCase();
    const clientName = (client.name || '').trim().toLowerCase();

    return Boolean(
        caseClientName &&
        clientName &&
        (caseClientName === clientName ||
            caseClientName.includes(clientName) ||
            clientName.includes(caseClientName))
    );
};

export const isActiveCase = (caseRecord: Case): boolean =>
    ['en cours', 'nouveau'].includes((caseRecord.status || '').trim().toLowerCase());
