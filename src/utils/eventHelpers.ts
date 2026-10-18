import { Event } from '../types';

export const getEventDescription = (type: Event['type']): string => {
  switch (type) {
    case 'Atelier':
      return "Atelier pratique et collaboratif visant à partager des connaissances, former les participants ou co-créer des solutions sur des sujets juridiques définis.";
    case 'Conférence':
      return "Réunion thématique d'échange professionnel. Utile pour consolider la position doctrinale et le réseau d'affaires du cabinet.";
    case 'Colloque':
      return "Séance académique majeure portant sur l'évolution jurisprudentielle et l'étude poussée des réformes législatives d'actualité.";
    case 'Séminaire':
      return "Formation ciblée sur les outils numériques et la gestion optimisée des dossiers. Recommandé pour tous les collaborateurs Juniors.";
    default:
      return "Événement de travail externe ou interne visant à coordonner les priorités ou les échéances clés du cabinet.";
  }
};
