-- The rows in this table are Refund Requests: a Learner's ask, which can be
-- Declined. "Refund" is reserved for the money returned on approval.
ALTER TABLE `refunds` RENAME TO `refund_requests`;--> statement-breakpoint
DROP INDEX `refunds_purchase_idx`;--> statement-breakpoint
CREATE INDEX `refund_requests_purchase_idx` ON `refund_requests` (`purchase_id`);
