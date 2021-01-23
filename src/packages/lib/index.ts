import RolesEnum from './enums/Roles.enum';
import CountAvailableFunc from './methods/ticketInventory/CountAvailable';

export namespace Istkt {
	export namespace Methods {
		export namespace TicketInventory {
			export const CountAvailable = CountAvailableFunc;
		}
	}

	export namespace Enums {
		export namespace User {
			export type RolesType = RolesEnum;
			export const Roles = RolesEnum;
		}
	}
}

export default Istkt;
