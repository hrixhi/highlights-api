/**
 * Used to count minimalQuota of ticket item, or qty of available tickets
 */
export default function (
  quantity: number,
  activated: number,
  bought: number
) {
  return (
    (quantity || 0) - ((activated || 0) + (bought || 0))
  );
}
