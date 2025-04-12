require "test_helper"

class LeaguesControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get leagues_index_url
    assert_response :success
  end

  test "should get show" do
    get leagues_show_url
    assert_response :success
  end

  test "should get new" do
    get leagues_new_url
    assert_response :success
  end

  test "should get create" do
    get leagues_create_url
    assert_response :success
  end

  test "should get edit" do
    get leagues_edit_url
    assert_response :success
  end

  test "should get update" do
    get leagues_update_url
    assert_response :success
  end

  test "should get destroy" do
    get leagues_destroy_url
    assert_response :success
  end

  test "should get register_team" do
    get leagues_register_team_url
    assert_response :success
  end

  test "should get schedule_matches" do
    get leagues_schedule_matches_url
    assert_response :success
  end

  test "should get standings" do
    get leagues_standings_url
    assert_response :success
  end
end
