module.exports = {
    notification_texts: {
        paid: {
            type: "paid",
            title: 'Congratulations.'
        },
        reminder: {
            type: "reminder",
            title: 'Match Reminder.'
        }
    },
    SUCCESS_MESSAGES: {
        SUCCESSFULLY_SIGNED_UP: 'Account created successfully',
        SUCCESSFULLY_LOGGED_IN: 'Logged in successfully',
        SUCCESSFULLY_UPDATED_DATA: 'Successfully updated',
        SUCCESSFULLY_LOGOUT: 'Successfully logged out',
        PASSWORD_CHANGED_SUCCESSFULLY: 'Password changed successfully',
        SUCCESSFULLY_VERIFIED: 'Successfully verified',
        SUCCESSFULLY_SENT_EMAIL: 'Successfully sent verification email',
        SUCCESSFULLY_ADDED: 'Successfully added',
        SUCCESSFULLY_FETCHED: 'Successfully fetched',
        SUCCESSFULLY_SENT_PASSWORD_RESET_EMAIL: 'Successfully sent an email to reset password',
        SUCCESSFULLY_UPLOADED: 'Successfully uploaded',
        SUCCESSFULLY_DELETED: 'Successfully deleted',
        SUCCESSFULLY_PAID: 'Successfully paid',
        SUCCESSFULLY_STARTED_IMPORTING: 'Import started successfully',
        SUCCESSFULLY_CREATED: "Created successfully"
    },
    ERROR_MESSAGES: {
        EMAIL_ALREADY_EXITS: "Email already exists",
        USERNAME_ALREADY_EXITS: "Username already exists",
        PHONE_ALREADY_EXITS: "Phone number already exists",
        USERNAME_REQUIRED: "Username is required to Sign up",
        PASSWORD_REQUIRED: "Password is required to Sign up",
        USERNAME_DONOT_EXITS: "User do not exists",
        TEAM_DONOT_EXITS: "Team do not exists",
        TEAM_ALREADY_EXITS: "Team already exists",
        MAX_PLAYERS: "Team can contain 13 players at max",
        CANNOT_DELETE_CAPTAIN: "Cannot delete captain of match, please make another player captain first to remove this user from team",
        PASSWORD_INCORRECT: "Incorrect password",
        PASSWORD_SAME: "New password should not be same as old",
        PASSWORD_MISSMATCH: "Mismatch New Passwords",
        INCORRECT_CODE: "Invalid Code",
        NOT_ABLE_TO_PAY: "Either match doesn't exist or you've already paid for this.",
    }
};
