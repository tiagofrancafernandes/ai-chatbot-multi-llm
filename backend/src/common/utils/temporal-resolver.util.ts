import { BusinessHours } from '../interfaces/business-hours.interface';

export interface TemporalContextInfo {
    now: Date;
    isoDate: string;
    formattedDate: string;
    dayOfWeek: number;
    dayName: string;
    timeString: string;
    isOpenNow: boolean;
    scheduleDescription: string;
    summaryPrompt: string;
}

export interface TemporalResolutionResult {
    hasTemporalReference: boolean;
    referenceTerm?: string;
    targetDateIso?: string;
    targetDateFormatted?: string;
    targetDayOfWeek?: number;
    targetDayName?: string;
    isOpenOnTargetDay?: boolean;
    targetSchedule?: string;
    responseMessage?: string;
}

export class TemporalResolver {
    public static readonly DEFAULT_TIMEZONE = 'America/Sao_Paulo';

    public static readonly DAY_NAMES_PT = [
        'domingo',
        'segunda-feira',
        'terça-feira',
        'quarta-feira',
        'quinta-feira',
        'sexta-feira',
        'sábado',
    ];

    public static getNowParts(
        timezone = TemporalResolver.DEFAULT_TIMEZONE,
        referenceDate = new Date()
    ): {
        year: number;
        month: number;
        day: number;
        dayOfWeek: number;
        hour: number;
        minute: number;
    } {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        }).formatToParts(referenceDate);

        const map: Record<string, string> = {};
        for (const p of parts) {
            map[p.type] = p.value;
        }

        const weekdayStr = map.weekday || 'Sun';
        const weekdayMap: Record<string, number> = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
        };

        return {
            year: parseInt(map.year, 10),
            month: parseInt(map.month, 10),
            day: parseInt(map.day, 10),
            dayOfWeek: weekdayMap[weekdayStr] ?? 0,
            hour: parseInt(map.hour, 10),
            minute: parseInt(map.minute, 10),
        };
    }

    public static computeDateWithOffset(
        offsetDays: number,
        timezone = TemporalResolver.DEFAULT_TIMEZONE,
        referenceDate = new Date()
    ): {
        isoDate: string;
        formattedDate: string;
        dayOfWeek: number;
        dayName: string;
    } {
        const parts = this.getNowParts(timezone, referenceDate);
        const targetUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays, 12, 0, 0));

        const targetParts = this.getNowParts(timezone, targetUtc);
        const dayName = this.DAY_NAMES_PT[targetParts.dayOfWeek] || 'domingo';
        const formattedDate = `${String(targetParts.day).padStart(2, '0')}/${String(targetParts.month).padStart(2, '0')}/${targetParts.year}`;
        const isoDate = `${targetParts.year}-${String(targetParts.month).padStart(2, '0')}-${String(targetParts.day).padStart(2, '0')}`;

        return {
            isoDate,
            formattedDate,
            dayOfWeek: targetParts.dayOfWeek,
            dayName,
        };
    }

    public static getCurrentTemporalContext(
        businessHours?: BusinessHours,
        timezone = TemporalResolver.DEFAULT_TIMEZONE,
        referenceDate = new Date()
    ): TemporalContextInfo {
        const parts = this.getNowParts(timezone, referenceDate);
        const dayName = this.DAY_NAMES_PT[parts.dayOfWeek] || 'domingo';
        const formattedDate = `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
        const isoDate = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
        const timeString = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;

        let isOpenNow = false;
        let scheduleToday = 'Fechado';

        // Weekdays: Seg-Sex (1 to 5)
        if (parts.dayOfWeek >= 1 && parts.dayOfWeek <= 5) {
            scheduleToday = '08:00 às 18:00';
            const currentTotalMin = parts.hour * 60 + parts.minute;
            isOpenNow = currentTotalMin >= 8 * 60 && currentTotalMin < 18 * 60;
        }

        // Saturday (6)
        if (parts.dayOfWeek === 6) {
            scheduleToday = '08:00 às 12:00';
            const currentTotalMin = parts.hour * 60 + parts.minute;
            isOpenNow = currentTotalMin >= 8 * 60 && currentTotalMin < 12 * 60;
        }

        // Sunday (0)
        if (parts.dayOfWeek === 0) {
            scheduleToday = 'Fechado (Domingos e Feriados)';
            isOpenNow = false;
        }

        const yesterday = this.computeDateWithOffset(-1, timezone, referenceDate);
        const tomorrow = this.computeDateWithOffset(1, timezone, referenceDate);

        const statusDescription =
            parts.dayOfWeek === 0
                ? `Hoje é domingo (${formattedDate}). A loja física para atendimento presencial está FECHADA hoje.`
                : isOpenNow
                  ? `Hoje é ${dayName} (${formattedDate}). A loja física está ABERTA agora (horário de hoje: ${scheduleToday}).`
                  : `Hoje é ${dayName} (${formattedDate}). A loja física está FECHADA no momento (horário de expediente: ${scheduleToday}).`;

        const summaryPrompt =
            `Contexto Temporal Oficial do Sistema:\n` +
            `• Data atual: ${dayName}, ${formattedDate} às ${timeString} (Fuso: ${timezone}).\n` +
            `• Hoje é: ${dayName}.\n` +
            `• Ontem foi: ${yesterday.dayName} (${yesterday.formattedDate}).\n` +
            `• Amanhã será: ${tomorrow.dayName} (${tomorrow.formattedDate}).\n` +
            `• Horário oficial de atendimento presencial:\n` +
            `  - Segunda a Sexta-feira: 08:00 às 18:00\n` +
            `  - Sábado: 08:00 às 12:00\n` +
            `  - Domingo e Feriados: FECHADO (sem atendimento presencial na loja física).\n` +
            `• Status presencial hoje (${dayName}): ${scheduleToday} (No momento: ${isOpenNow ? 'ABERTO' : 'FECHADO'}).\n` +
            `• Autoatendimento virtual (Chat IA): Disponível 24h por dia.`;

        return {
            now: referenceDate,
            isoDate,
            formattedDate,
            dayOfWeek: parts.dayOfWeek,
            dayName,
            timeString,
            isOpenNow,
            scheduleDescription: statusDescription,
            summaryPrompt,
        };
    }

    public static resolveTemporalQuery(
        text: string,
        businessHours?: BusinessHours,
        knowledgeBaseText?: string,
        timezone = TemporalResolver.DEFAULT_TIMEZONE,
        referenceDate = new Date()
    ): TemporalResolutionResult {
        const lower = (text || '').toLowerCase().trim();
        const currentContext = this.getCurrentTemporalContext(businessHours, timezone, referenceDate);
        const currentDayOfWeek = currentContext.dayOfWeek;

        // 1. Check for specific relative day expressions
        let offsetDays: number | null = null;
        let matchedTerm: string | null = null;
        let isRoutinePlural = false;

        if (lower.includes('antes de ontem') || lower.includes('anteontem') || lower.includes('ante-ontem')) {
            offsetDays = -2;
            matchedTerm = 'anteontem';
        }

        if ((offsetDays === null && lower.includes('depois de amanhã')) || lower.includes('depois de amanha')) {
            offsetDays = 2;
            matchedTerm = 'depois de amanhã';
        }

        if (offsetDays === null && (lower.includes('amanhã') || lower.includes('amanha'))) {
            offsetDays = 1;
            matchedTerm = 'amanhã';
        }

        if (offsetDays === null && lower.includes('ontem')) {
            offsetDays = -1;
            matchedTerm = 'ontem';
        }

        if (
            offsetDays === null &&
            (lower.includes('hoje') ||
                lower.includes('no momento') ||
                lower.includes('agora') ||
                lower.includes('neste momento'))
        ) {
            offsetDays = 0;
            matchedTerm = 'hoje';
        }

        // 2. Check for weekdays references (e.g. domingo, segunda, terça, quarta, quinta, sexta, sábado)
        if (offsetDays === null) {
            const isNextWeek =
                lower.includes('que vem') ||
                lower.includes('próxima') ||
                lower.includes('proxima') ||
                lower.includes('próximo') ||
                lower.includes('proximo');

            const isPastWeek = lower.includes('passada') || lower.includes('passado');

            const weekdayTokens = [
                { names: ['domingo', 'domingos'], day: 0 },
                { names: ['segunda-feira', 'segunda', 'segundas'], day: 1 },
                { names: ['terça-feira', 'terca-feira', 'terça', 'terca', 'terças', 'tercas'], day: 2 },
                { names: ['quarta-feira', 'quarta', 'quartas'], day: 3 },
                { names: ['quinta-feira', 'quinta', 'quintas'], day: 4 },
                { names: ['sexta-feira', 'sexta', 'sextas'], day: 5 },
                { names: ['sábado', 'sabado', 'sábados', 'sabados'], day: 6 },
            ];

            for (const item of weekdayTokens) {
                const found = item.names.some((name) => lower.includes(name));
                if (!found) {
                    continue;
                }

                matchedTerm = item.names[0];

                if (lower.includes('aos domingos') || lower.includes('às segundas') || lower.includes('aos sábados')) {
                    isRoutinePlural = true;
                }

                // If user asks "atende aos domingos?", it is a routine inquiry about Sundays
                if (lower.includes('domingo') && !isNextWeek && !isPastWeek) {
                    isRoutinePlural = true;
                }

                let diff = item.day - currentDayOfWeek;

                if (diff === 0 && isNextWeek) {
                    diff = 7;
                }

                if (diff < 0 && !isPastWeek) {
                    diff += 7;
                }

                if (isPastWeek && diff >= 0) {
                    diff -= 7;
                }

                offsetDays = diff;
                break;
            }
        }

        // Check if query is about presencial attendance, opening, hours, schedule
        const isAttendanceQuery =
            lower.includes('atendimento presencial') ||
            lower.includes('atendimento físico') ||
            lower.includes('atendem presencial') ||
            lower.includes('atende presencial') ||
            lower.includes('tem atendimento') ||
            lower.includes('atende') ||
            lower.includes('atendem') ||
            lower.includes('abre') ||
            lower.includes('abrem') ||
            lower.includes('funciona') ||
            lower.includes('funcionam') ||
            lower.includes('aberto') ||
            lower.includes('fechado') ||
            lower.includes('horário') ||
            lower.includes('horario') ||
            lower.includes('que horas');

        if (!isAttendanceQuery && offsetDays === null) {
            return { hasTemporalReference: false };
        }

        // Default to 'hoje' if query is about attendance/hours but didn't specify another day
        if (offsetDays === null) {
            offsetDays = 0;
            matchedTerm = 'hoje';
        }

        const target = this.computeDateWithOffset(offsetDays, timezone, referenceDate);
        const targetDay = target.dayOfWeek;

        let isOpenOnTargetDay = false;
        let scheduleOnTargetDay = 'Fechado';

        if (targetDay >= 1 && targetDay <= 5) {
            isOpenOnTargetDay = true;
            scheduleOnTargetDay = '08:00 às 18:00';
        }

        if (targetDay === 6) {
            isOpenOnTargetDay = true;
            scheduleOnTargetDay = '08:00 às 12:00';
        }

        if (targetDay === 0) {
            isOpenOnTargetDay = false;
            scheduleOnTargetDay = 'Fechado (Domingos e Feriados)';
        }

        // Build human-friendly, accurate explanation
        let responseMessage = '';

        const isSpecificallySundayQuery =
            lower.includes('domingo') || lower.includes('domingos') || isRoutinePlural || matchedTerm === 'domingo';

        // Case A: Query specifically about Sundays (e.g. "atende aos domingos?", "abre domingo?")
        if (isSpecificallySundayQuery) {
            responseMessage =
                `**Não**, aos **domingos e feriados** nossa loja física e escritório comercial **não realizam atendimento presencial** (ficamos fechados).\n\n` +
                `📍 **Horário de Atendimento Presencial:**\n` +
                `• **Segunda a Sexta-feira:** 08:00 às 18:00\n` +
                `• **Sábado:** 08:00 às 12:00\n` +
                `• **Domingos e Feriados:** Fechado (com plantão técnico para emergências de rede).\n\n` +
                `📍 **Endereço da Loja:** R. Tiradentes, 405 - Carmo do Cajuru, MG.\n\n` +
                `*(Nosso atendimento virtual inteligente por aqui funciona 24 horas todos os dias!).* Como posso te ajudar agora?`;
        }

        // Case B: Query about "hoje"
        if (!responseMessage && offsetDays === 0) {
            if (currentDayOfWeek === 0) {
                responseMessage =
                    `**Hoje é domingo (${target.formattedDate})**, e nossa loja física para atendimento presencial está **fechada** aos domingos.\n\n` +
                    `📍 **Horário de Atendimento Presencial na Loja:**\n` +
                    `• **Segunda a Sexta-feira:** 08:00 às 18:00\n` +
                    `• **Sábado:** 08:00 às 12:00\n` +
                    `• **Domingos e Feriados:** Fechado\n\n` +
                    `📍 **Endereço:** R. Tiradentes, 405 - Carmo do Cajuru, MG.\n\n` +
                    `Reabriremos nosso atendimento presencial amanhã (segunda-feira) às 08:00. Pelo nosso chat virtual estou à disposição agora! O que você precisa?`;
            }

            if (!responseMessage && currentContext.isOpenNow) {
                responseMessage =
                    `**Sim!** Hoje é **${target.dayName} (${target.formattedDate})**, e nosso atendimento presencial está **aberto agora**!\n\n` +
                    `• Horário de hoje: das **${scheduleOnTargetDay}**\n` +
                    `📍 **Endereço da Loja:** R. Tiradentes, 405 - Carmo do Cajuru, MG\n` +
                    `📞 **Telefone:** (37) 3333-4444\n\n` +
                    `Venha nos fazer uma visita ou me diga como posso te ajudar por aqui!`;
            }

            if (!responseMessage && !currentContext.isOpenNow) {
                responseMessage =
                    `Hoje é **${target.dayName} (${target.formattedDate})**, mas nosso atendimento presencial **não está aberto no momento** (nosso horário de expediente hoje foi/é das **${scheduleOnTargetDay}**).\n\n` +
                    `📍 **Endereço:** R. Tiradentes, 405 - Carmo do Cajuru, MG.\n\n` +
                    `Nosso chat virtual funciona 24h para você tirar dúvidas, consultar faturas e contratar planos. Como posso te ajudar?`;
            }
        }

        // Case C: Query about "amanhã"
        if (!responseMessage && offsetDays === 1) {
            if (isOpenOnTargetDay) {
                responseMessage =
                    `**Sim!** Amanhã (**${target.dayName}, ${target.formattedDate}**) teremos atendimento presencial normalmente das **${scheduleOnTargetDay}**.\n\n` +
                    `📍 **Endereço da Loja:** R. Tiradentes, 405 - Carmo do Cajuru, MG\n` +
                    `📞 **Telefone:** (37) 3333-4444\n\n` +
                    `Como posso te ajudar hoje enquanto isso?`;
            }

            if (!responseMessage) {
                responseMessage =
                    `Amanhã é **${target.dayName} (${target.formattedDate})**, e nossa loja física para atendimento presencial estará **fechada** (${scheduleOnTargetDay}).\n\n` +
                    `📍 Nosso atendimento presencial funciona de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.\n\n` +
                    `Como posso te ajudar pelo atendimento virtual hoje?`;
            }
        }

        // Case D: General future or specific relative days (e.g. "depois de amanhã", "sexta que vem")
        if (!responseMessage) {
            if (isOpenOnTargetDay) {
                responseMessage =
                    `**Sim!** Em **${target.dayName} (${target.formattedDate})**, nosso atendimento presencial funcionará normalmente das **${scheduleOnTargetDay}**.\n\n` +
                    `📍 **Endereço:** R. Tiradentes, 405 - Carmo do Cajuru, MG (Telefone: (37) 3333-4444).\n\n` +
                    `Deseja tirar alguma dúvida sobre nossos planos ou serviços?`;
            }

            if (!responseMessage) {
                responseMessage =
                    `Em **${target.dayName} (${target.formattedDate})**, nossa loja física estará **fechada** para atendimento presencial (${scheduleOnTargetDay}).\n\n` +
                    `📍 Nossos horários presenciais normais são de Segunda a Sexta das 08:00 às 18:00 e Sábados das 08:00 às 12:00.\n\n` +
                    `Como posso te ajudar no momento?`;
            }
        }

        return {
            hasTemporalReference: true,
            referenceTerm: matchedTerm || 'hoje',
            targetDateIso: target.isoDate,
            targetDateFormatted: target.formattedDate,
            targetDayOfWeek: targetDay,
            targetDayName: target.dayName,
            isOpenOnTargetDay,
            targetSchedule: scheduleOnTargetDay,
            responseMessage,
        };
    }
}
