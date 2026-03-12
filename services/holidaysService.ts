export interface Holiday {
    date: string; // "YYYY-MM-DD"
    name: string;
    type: string;
}

const holidaysCache: Record<number, Holiday[]> = {};

export const HolidaysService = {
    async getHolidays(year: number): Promise<Holiday[]> {
        if (holidaysCache[year]) {
            return holidaysCache[year];
        }

        try {
            // Fetch from Brasil API
            const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
            if (response.ok) {
                const rawHolidays = await response.json();
                const holidays = rawHolidays.map((h: any) => ({
                    date: h.date,
                    name: h.name,
                    type: h.type
                }));
                holidaysCache[year] = holidays;
                return holidays;
            }
            return [];
        } catch (error) {
            console.error('[Holidays] Error fetching holidays for year', year, error);
            // Ignore error and return empty to avoid breaking the UI
            return [];
        }
    },

    getHolidayForDate(holidays: Holiday[], dateString: string): Holiday | undefined {
        // dateString format: "YYYY-MM-DD"
        return holidays.find(h => h.date === dateString);
    }
};
