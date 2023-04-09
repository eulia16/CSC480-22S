package edu.oswego.cs;

import edu.oswego.cs.application.DeadlineTracker;
import edu.oswego.cs.daos.AssignmentDAO;
import edu.oswego.cs.daos.CourseDAO;
import edu.oswego.cs.daos.StudentDAO;
import edu.oswego.cs.daos.TeamDAO;
import edu.oswego.cs.database.AssignmentInterface;
import edu.oswego.cs.database.CourseInterface;
import edu.oswego.cs.services.EmailService;
import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.client.WebTarget;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.bson.Document;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;


/*
    NOTE: before testing, you need to have two professors, 7 students, 2 courses, 4 teams, and 3 assignments set up in
    the database as follows:

    Main Course: Main Professor, Students 1-6
    Alt Course: Alt Professor, Students 6 and Alt

    Teams: (In Main Course) Students 1 + 2, Students 3 + 4, Students 5 + 6
           (In Alt Course) Students 5 and Alt

    Assignments: (All in Main Course)
        Assignment 1: Do not have anybody submit anything
        Assignment 2: Have all the teams submit something, but don't send out Peer Reviews
        Assignment 3: Have all the teams submit something and do all the peer reviews (2 per team)

    Put all the ids for the database objects in the variables below.

    If you don't see any emails, try checking your spam folder. It should go without saying that all the emails you
    put for the students and professors should be ones you have access to.

    If running the tests gives an "array out of bounds" error, make sure you've updated the getPath() method in
    EmailService.java
 */
public class EmailTests {
    private static final Jsonb jsonb = JsonbBuilder.create();
    private static Client client;
    private Response okResponse = Response.status(Response.Status.OK).build();

    //You must set these emails to emails you can access in order to properly test the microservice.
    private final String mainProfessorEmail = "pschmitt@oswego.edu";
    private final String altProfessorEmail = "squeeshyandpike@gmail.com";
    private static final String student1Email = "quantummechanistjp@gmail.com";
    private static final String student2Email = "yoinkysploinky994@gmail.com";
    private static final String student3Email = "starrringo889@gmail.com";
    private static final String student4Email = "tunneldiggertsegrot@gmail.com";
    private static final String student5Email = "gronkoxtreme@gmail.com";
    private static final String student6Email = "peteymuskrat@gmail.com";
    private static final String altStudentEmail = "balonjalbatross@gmail.com";
    private static final String team1Name = "12"; //students 1 and 2
    private static final String team2Name = "34"; //students 3 and 4
    private static final String team3Name = "56"; //students 5 and 6
    private static final String team4Name = "78"; //students 5 and 6
    private static String mainCourseID = "MAI101-1-101-Spring-2023";
    private static String altCourseID = "ALT101-1-101-Spring-2023";
    private int ass1ID = 1;
    private int ass2ID = 2;
    private int ass3ID = 3;

    @Test
    public void testCreateAssignmentEmail() throws IOException {
        new EmailService().assignmentCreatedEmail(mainCourseID, ass1ID);
        //The appropriate email should be sent to all students in the main course, and nobody else.
    }

    @Test
    public void testAssignmentSubmittedEmail() throws IOException {
        new EmailService().assignmentSubmittedEmail(mainCourseID, team1Name, ass1ID);

        //should send an email to students 1 & 2. This method should always send an email if called, unless the database
        //is screwed up, in which case it will throw an exception.
    }

    @Test
    public void testAllAssignmentsSubmittedEmail() throws IOException {
        new EmailService().allAssignmentsSubmittedEmail(mainCourseID, ass1ID);
        //should send an email to the professor of the main course.
    }

    @Test
    public void testAllAssignmentsSubmittedEmailButNotAllTheAssignmentsAreSubmitted() throws IOException {
        new EmailService().allAssignmentsSubmittedEmail(mainCourseID, ass2ID);
        //should not send any emails, since not all assignments have been submitted for assignment 2.
    }

    @Test
    public void testPeerReviewAssignedEmail() throws IOException {
        new EmailService().peerReviewAssignedEmail(mainCourseID, ass1ID);
        //should send an email to all the students in the main course.
    }

    @Test
    public void testPeerReviewSubmittedEmail() throws IOException {
        new EmailService().peerReviewSubmittedEmail(new CourseInterface().getStudent(student3Email), mainCourseID, team1Name, ass1ID);
        //should send an email to students 3 and 4.
    }

    @Test
    public void testAllPeerReviewsSubmittedEmailButNotAllThePeerReviewsAreSubmitted() throws IOException {
        new EmailService().allPeerReviewsSubmittedEmail(mainCourseID, ass2ID);
    }

    @Test
    public void testAllPeerReviewsSubmittedEmail() throws IOException {
        new EmailService().allAssignmentsSubmittedEmail(mainCourseID, ass1ID);
        //should send an email to the professor of the main course.
    }

    @Test
    public void testAssignmentDeadlinePassedEmail() throws IOException {
        new EmailService().assignmentDeadlinePassed(mainCourseID, ass2ID);

        //the method itself doesn't check if the deadline passed, so this should send the professor an email
    }

    @Test
    public void testAssignmentDeadlinePassedEmailButTheyWereAllSubmitted() throws IOException {
        new EmailService().assignmentDeadlinePassed(mainCourseID, ass1ID);

        //No email should be sent.
    }

    @Test
    public void testPeerReviewDeadlinePassedEmail() throws IOException {
        new EmailService().peerReviewDeadlinePassed(mainCourseID, ass2ID);

        //the method itself doesn't check if the deadline passed, so this should send the professor an email
    }

    @Test
    public void testPeerReviewDeadlinePassedEmailButTheyWereAllSubmitted() throws IOException {
        new EmailService().peerReviewDeadlinePassed(mainCourseID, ass1ID);

        //the method itself doesn't check if the deadline passed, so this should send the professor an email
    }

    @Test
    public void testGradeReceivedEmail() throws IOException {
        new EmailService().gradeReceivedEmail(mainCourseID, ass1ID, team1Name);
        //should send an email to Students 1 and 2.
    }

    @Test
    public void testOutlierEmail() throws IOException {
        new EmailService().outlierDetectedEmail(mainCourseID, team3Name, ass1ID);
        //should send the professor an email
    }

    @Test
    public void testDeadlineTimer(){
        new DeadlineTracker().init();
    }
}